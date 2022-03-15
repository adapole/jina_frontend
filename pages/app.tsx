import React from 'react';
import WalletConnect from '@walletconnect/client';
import QRCodeModal from 'algorand-walletconnect-qrcode-modal';
import { IInternalEvent } from '@walletconnect/types';
import { formatJsonRpcRequest } from '@json-rpc-tools/utils';
import algosdk from 'algosdk';
import {
	apiGetAccountAssets,
	apiSubmitTransactions,
	ChainType,
	apiGetTxnParams,
} from './helpers/api';
import { IAssetData, IWalletTransaction, SignTxnParams } from './helpers/types';
import Modal from '../components/Modal';
import Loader from '../components/Loader';
import Header from '../components/Header';
import AccountAssets from '../components/AccountAssets';
import Body from '../components/Body';
import ExampleSigner from '../components/ExampleSigner';
import { Scenario, scenarios } from './scenarios';
import { CheckCircleIcon } from '@heroicons/react/solid';
import lsg from '../public/lsa.json';

interface IResult {
	method: string;
	body: Array<
		Array<{
			txID: string;
			signingAddress?: string;
			signature: string;
		} | null>
	>;
}

interface IAppState {
	connector: WalletConnect | null;
	fetching: boolean;
	connected: boolean;
	showModal: boolean;
	pendingRequest: boolean;
	signedTxns: Uint8Array[][] | null;
	pendingSubmissions: Array<number | Error>;
	uri: string;
	accounts: string[];
	address: string;
	result: IResult | null;
	chain: ChainType;
	assets: IAssetData[];
}

function signTxnWithTestAccount(txn: algosdk.Transaction): Uint8Array {
	const sender = algosdk.encodeAddress(txn.from.publicKey);

	for (const testAccount of testAccounts) {
		if (testAccount.addr === sender) {
			return txn.signTxn(testAccount.sk);
		}
	}

	throw new Error(
		`Cannot sign transaction from unknown test account: ${sender}`
	);
}

function signTxnLogicSigWithTestAccount(txn: algosdk.Transaction): Uint8Array {
	const sender = algosdk.encodeAddress(txn.from.publicKey);

	for (const testAccount of testAccounts) {
		if (testAccount.addr === sender) {
			//let rawSignedTxn = algosdk.signLogicSigTransactionObject(txn, lsg)
			return txn.signTxn(testAccount.sk);
		}
	}

	throw new Error(
		`Cannot sign transaction from unknown test account: ${sender}`
	);
}

interface IScenarioTxn {
	txn: algosdk.Transaction;
	signers?: string[];
	authAddr?: string;
	message?: string;
}

type ScenarioReturnType = IScenarioTxn[][];

type Scenario1 = (
	chain: ChainType,
	address: string
) => Promise<ScenarioReturnType>;

const testAccounts = [
	//algosdk.mnemonicToSecretKey(
	//	'cannon scatter chest item way pulp seminar diesel width tooth enforce fire rug mushroom tube sustain glide apple radar chronic ask plastic brown ability badge'
	//),
	algosdk.mnemonicToSecretKey(
		'excuse help topic once acoustic decline stock insane convince dove debate main bullet violin guess anchor salt account spin unaware grain modify install absent account'
	),
	//process.env.TESTACCOUNT_MENMONIC
];

const singlePayTxn1: Scenario1 = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);

	const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
		from: address,
		to: testAccounts[0].addr,
		amount: 100000,
		note: new Uint8Array(Buffer.from('example note value')),
		suggestedParams,
	});

	const txnsToSign = [{ txn, message: 'This is a transaction message' }];
	return [txnsToSign];
};

enum AssetTransactionType {
	Transfer = 'asset-transfer',
	OptIn = 'asset-opt-in',
	Close = 'asset-close',
}
function getAssetIndex(chain: ChainType, type: AssetTransactionType): number {
	if (chain === ChainType.MainNet) {
		return 0;
	}

	if (type === AssetTransactionType.Transfer) {
		return 71360698; // Jina
	} else if (type === AssetTransactionType.Close) {
		return 71360698; // testasset2 180132
	} else {
		return 71360698; // Jina
	}
}
const singleAssetOptInTxn: Scenario1 = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);
	const assetIndex = getAssetIndex(chain, AssetTransactionType.OptIn);

	const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
		from: address,
		to: address,
		amount: 0,
		assetIndex,
		note: new Uint8Array(Buffer.from('example note value')),
		suggestedParams,
	});

	const txnsToSign = [{ txn }];
	return [txnsToSign];
};
const singleAssetTransferTxn: Scenario1 = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);
	const transferAssetIndex = getAssetIndex(
		chain,
		AssetTransactionType.Transfer
	);
	const optInAssetIndex = getAssetIndex(chain, AssetTransactionType.OptIn);

	const txn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
		from: address,
		to: address,
		amount: 0,
		assetIndex: optInAssetIndex,
		note: new Uint8Array(Buffer.from('Opt-in to jUSD')),
		suggestedParams,
	});

	const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
		from: testAccounts[0].addr,
		to: address,
		amount: 10000000,
		assetIndex: transferAssetIndex,
		note: new Uint8Array(Buffer.from('dispencer 10 jUSD')),
		suggestedParams,
	});

	const txnsToSign = [{ txn: txn1 }, { txn: txn2, signers: [] }];

	algosdk.assignGroupID(txnsToSign.map((toSign) => toSign.txn));
	return [txnsToSign];
};

function getAppIndex(chain: ChainType): number {
	if (chain === ChainType.MainNet) {
		return 305162725;
	}

	if (chain === ChainType.TestNet) {
		return 22314999;
	}

	throw new Error(`App not defined for chain ${chain}`);
}

const singleAppOptIn: Scenario1 = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);

	const appIndex = getAppIndex(chain);

	const txn = algosdk.makeApplicationOptInTxnFromObject({
		from: address,
		appIndex,
		note: new Uint8Array(Buffer.from('example note value')),
		appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
		suggestedParams,
	});

	const txnsToSign = [{ txn }];
	return [txnsToSign];
};

const singleAppCall: Scenario1 = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);

	const appIndex = getAppIndex(chain);

	const txn = algosdk.makeApplicationNoOpTxnFromObject({
		from: address,
		appIndex,
		note: new Uint8Array(Buffer.from('example note value')),
		appArgs: [Uint8Array.from([0]), Uint8Array.from([0, 1])],
		suggestedParams,
	});

	const txnsToSign = [{ txn }];
	return [txnsToSign];
};

const singleAppCallNoArgs: Scenario1 = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);

	const appIndex = getAppIndex(chain);

	const txn = algosdk.makeApplicationNoOpTxnFromObject({
		from: address,
		appIndex,
		note: new Uint8Array(Buffer.from('example note value')),
		appArgs: [],
		suggestedParams,
	});

	const txnsToSign = [{ txn }];
	return [txnsToSign];
};
/*
{
		name: 'App OPT-IN',
		scenario1: singleAppOptIn,
	},
	{
		name: 'dispencer',
		scenario1: singleAssetTransferTxn,
	},
*/
const scenarios1: Array<{ name: string; scenario1: Scenario1 }> = [
	{
		name: 'Dispense',
		scenario1: singleAssetTransferTxn,
	},
];

const INITIAL_STATE: IAppState = {
	connector: null,
	fetching: false,
	connected: false,
	showModal: false,
	pendingRequest: false,
	signedTxns: null,
	pendingSubmissions: [],
	uri: '',
	accounts: [],
	address: '',
	result: null,
	chain: ChainType.TestNet,
	assets: [],
};

class App extends React.Component<unknown, IAppState> {
	public state: IAppState = {
		...INITIAL_STATE,
	};

	public walletConnectInit = async () => {
		// bridge url
		const bridge = 'https://bridge.walletconnect.org';

		// create new connector
		const connector = new WalletConnect({ bridge, qrcodeModal: QRCodeModal });

		await this.setState({ connector });

		// check if already connected
		if (!connector.connected) {
			// create new session
			await connector.createSession();
		}

		// subscribe to events
		await this.subscribeToEvents();
	};
	public subscribeToEvents = () => {
		const { connector } = this.state;

		if (!connector) {
			return;
		}

		connector.on('session_update', async (error, payload) => {
			console.log(`connector.on("session_update")`);

			if (error) {
				throw error;
			}

			const { accounts } = payload.params[0];
			this.onSessionUpdate(accounts);
		});

		connector.on('connect', (error, payload) => {
			console.log(`connector.on("connect")`);

			if (error) {
				throw error;
			}

			this.onConnect(payload);
		});

		connector.on('disconnect', (error, payload) => {
			console.log(`connector.on("disconnect")`);

			if (error) {
				throw error;
			}

			this.onDisconnect();
		});

		if (connector.connected) {
			const { accounts } = connector;
			const address = accounts[0];
			this.setState({
				connected: true,
				accounts,
				address,
			});
			this.onSessionUpdate(accounts);
		}

		this.setState({ connector });
	};

	public killSession = async () => {
		const { connector } = this.state;
		if (connector) {
			connector.killSession();
		}
		this.resetApp();
	};

	public chainUpdate = (newChain: ChainType) => {
		this.setState({ chain: newChain }, this.getAccountAssets);
	};

	public resetApp = async () => {
		await this.setState({ ...INITIAL_STATE });
	};

	public onConnect = async (payload: IInternalEvent) => {
		const { accounts } = payload.params[0];
		const address = accounts[0];
		await this.setState({
			connected: true,
			accounts,
			address,
		});
		this.getAccountAssets();
	};

	public onDisconnect = async () => {
		this.resetApp();
	};

	public onSessionUpdate = async (accounts: string[]) => {
		const address = accounts[0];
		await this.setState({ accounts, address });
		await this.getAccountAssets();
	};

	public getAccountAssets = async () => {
		const { address, chain } = this.state;
		this.setState({ fetching: true });
		try {
			// get account balances
			const assets = await apiGetAccountAssets(chain, address);

			await this.setState({ fetching: false, address, assets });
		} catch (error) {
			console.error(error);
			await this.setState({ fetching: false });
		}
	};

	public toggleModal = () =>
		this.setState({
			showModal: !this.state.showModal,
			pendingSubmissions: [],
		});

	public signTxnScenario = async (scenario1: Scenario1) => {
		const { connector, address, chain } = this.state;

		if (!connector) {
			return;
		}

		try {
			const txnsToSign = await scenario1(chain, address);

			// open modal
			this.toggleModal();

			// toggle pending request indicator
			this.setState({ pendingRequest: true });

			const flatTxns = txnsToSign.reduce((acc, val) => acc.concat(val), []);

			const walletTxns: IWalletTransaction[] = flatTxns.map(
				({ txn, signers, authAddr, message }) => ({
					txn: Buffer.from(algosdk.encodeUnsignedTransaction(txn)).toString(
						'base64'
					),
					signers, // TODO: put auth addr in signers array
					authAddr,
					message,
				})
			);

			// sign transaction
			const requestParams: SignTxnParams = [walletTxns];
			const request = formatJsonRpcRequest('algo_signTxn', requestParams);
			const result: Array<string | null> = await connector.sendCustomRequest(
				request
			);

			console.log('Raw response:', result);

			const indexToGroup = (index: number) => {
				for (let group = 0; group < txnsToSign.length; group++) {
					const groupLength = txnsToSign[group].length;
					if (index < groupLength) {
						return [group, index];
					}

					index -= groupLength;
				}

				throw new Error(`Index too large for groups: ${index}`);
			};

			const signedPartialTxns: Array<Array<Uint8Array | null>> = txnsToSign.map(
				() => []
			);
			result.forEach((r, i) => {
				const [group, groupIndex] = indexToGroup(i);
				const toSign = txnsToSign[group][groupIndex];

				if (r == null) {
					if (toSign.signers !== undefined && toSign.signers?.length < 1) {
						signedPartialTxns[group].push(null);
						return;
					}
					throw new Error(
						`Transaction at index ${i}: was not signed when it should have been`
					);
				}

				if (toSign.signers !== undefined && toSign.signers?.length < 1) {
					throw new Error(
						`Transaction at index ${i} was signed when it should not have been`
					);
				}

				const rawSignedTxn = Buffer.from(r, 'base64');
				signedPartialTxns[group].push(new Uint8Array(rawSignedTxn));
			});

			const signedTxns: Uint8Array[][] = signedPartialTxns.map(
				(signedPartialTxnsInternal, group) => {
					return signedPartialTxnsInternal.map((stxn, groupIndex) => {
						if (stxn) {
							return stxn;
						}

						return signTxnWithTestAccount(txnsToSign[group][groupIndex].txn);
					});
				}
			);

			const signedTxnInfo: Array<
				Array<{
					txID: string;
					signingAddress?: string;
					signature: string;
				} | null>
			> = signedPartialTxns.map((signedPartialTxnsInternal, group) => {
				return signedPartialTxnsInternal.map((rawSignedTxn, i) => {
					if (rawSignedTxn == null) {
						return null;
					}

					const signedTxn = algosdk.decodeSignedTransaction(rawSignedTxn);
					const txn = signedTxn.txn as unknown as algosdk.Transaction;
					const txID = txn.txID();
					const unsignedTxID = txnsToSign[group][i].txn.txID();

					if (txID !== unsignedTxID) {
						throw new Error(
							`Signed transaction at index ${i} differs from unsigned transaction. Got ${txID}, expected ${unsignedTxID}`
						);
					}

					if (!signedTxn.sig) {
						throw new Error(
							`Signature not present on transaction at index ${i}`
						);
					}

					return {
						txID,
						signingAddress: signedTxn.sgnr
							? algosdk.encodeAddress(signedTxn.sgnr)
							: undefined,
						signature: Buffer.from(signedTxn.sig).toString('base64'),
					};
				});
			});

			console.log('Signed txn info:', signedTxnInfo);

			// format displayed result
			const formattedResult: IResult = {
				method: 'algo_signTxn',
				body: signedTxnInfo,
			};

			// display result
			this.setState({
				connector,
				pendingRequest: false,
				signedTxns,
				result: formattedResult,
			});
		} catch (error) {
			console.error(error);
			this.setState({ connector, pendingRequest: false, result: null });
		}
	};

	public async submitSignedTransaction() {
		const { signedTxns, chain } = this.state;
		if (signedTxns == null) {
			throw new Error('Transactions to submit are null');
		}

		this.setState({ pendingSubmissions: signedTxns.map(() => 0) });

		signedTxns.forEach(async (signedTxn, index) => {
			try {
				const confirmedRound = await apiSubmitTransactions(chain, signedTxn);

				this.setState((prevState) => {
					return {
						pendingSubmissions: prevState.pendingSubmissions.map((v, i) => {
							if (index === i) {
								return confirmedRound;
							}
							return v;
						}),
					};
				});

				console.log(`Transaction confirmed at round ${confirmedRound}`);
			} catch (err) {
				this.setState((prevState) => {
					return {
						pendingSubmissions: prevState.pendingSubmissions.map((v, i) => {
							if (index === i) {
								return err;
							}
							return v;
						}),
					};
				});

				console.error(`Error submitting transaction at index ${index}:`, err);
			}
		});
	}

	public render = () => {
		const {
			connector,
			chain,
			assets,
			address,
			connected,
			fetching,
			showModal,
			pendingRequest,
			pendingSubmissions,
			result,
		} = this.state;
		const JINAtoken = assets.find(
			(asset: IAssetData) => asset && asset.id === 71360698
		) || {
			id: 71360698,
			amount: BigInt(0),
			creator: '',
			frozen: false,
			decimals: 6,
			name: 'jUSD',
			unitName: 'jUSD',
		};
		return (
			<div>
				<div>
					<Header
						connected={connected}
						address={address}
						killsession={this.killSession}
						chain={chain}
						chainupdate={this.chainUpdate}
					/>
					<header className='flex w-full p-5 justify-between text-sm text-gray-500'>
						{!address && !assets.length ? (
							<>
								<div className='flex space-x-4 items-center'>
									<p className='link'>About</p>
									{/* <p className='link'>Whitepaper</p> */}
								</div>
								<div className='flex space-x-4 items-center'>
									<div className='relative group'>
										<div className='absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-md blur opacity-75 group-hover:opacity-100 transition duration-600 group-hover:duration-200 animate-tilt'></div>
										<button
											onClick={this.walletConnectInit}
											className='relative px-7 py-2 rounded-md leading-none flex items-center divide-x divide-gray-600 bg-black'
										>
											<span className='pr-2 text-gray-100'>Connect wallet</span>
										</button>
									</div>
								</div>
							</>
						) : (
							<div>
								{/* <h3>10 Jina dispencer</h3>
								{!fetching ? <AccountAssets assets={assets} /> : <div />}
								<div className='content-center'>
									<div>
										{scenarios1.map(({ name, scenario1 }) => (
											<button
												className='relative px-7 py-2 rounded-md leading-none flex items-center bg-[#2CB7BC] text-gray-100 opacity-75 hover:opacity-100'
												key={name}
												onClick={() => this.signTxnScenario(scenario1)}
											>
												{name}
											</button>
										))}
									</div>
								</div> */}
							</div>
						)}
					</header>
					<div>
						{/* Body */}
						{!address && !assets.length ? (
							<>
								<ExampleSigner />
							</>
						) : (
							<Body
								assets={assets}
								connector={connector}
								address={address}
								chain={chain}
							/>
						)}
					</div>
					{!address && !assets.length ? (
						<></>
					) : (
						<div className='flex w-full max-w-2xl items-center justify-evenly sm:w-48 sm:flex-wrap bg-white rounded-lg shadow-md p-6 fixed bottom-0 mt-4 hover:cursor-pointer group'>
							{JINAtoken && JINAtoken.amount > 5 ? (
								<>
									<div className='flex justify-between items-center'>
										<h1 className='uppercase text-sm sm:text-base tracking-wide'>
											Dispencer
										</h1>
										<div>
											<CheckCircleIcon className='h-4 sm:h-5 sm:mr-3 text-gray-500 cursor-pointer transition duration-100 transform hover:scale-125' />
											<span className='absolute w-auto p-2 m-2 min-w-max left-48 rounded-md text-white bg-gray-900 text-xs font-bold transition-all duration-100 scale-0 origin-left group-hover:scale-100'>
												You already have Jusd!
											</span>
										</div>
									</div>
									<div className='mb-0.5 font-semibold'>
										<span className='text-3xl sm:text-5xl mr-2'>10</span>
										<span className='text-xl sm:text-2xl'>JUSD</span>
									</div>
									<div className='content-center'>
										<div>
											{scenarios1.map(({ name, scenario1 }) => (
												<button
													className='relative px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#18393a] text-gray-100'
													key={name}
													onClick={() => this.signTxnScenario(scenario1)}
												>
													{name}
												</button>
											))}
										</div>
									</div>
								</>
							) : (
								<>
									<div className='flex justify-between items-center'>
										<h1 className='uppercase text-sm sm:text-base tracking-wide'>
											Dispencer
										</h1>
									</div>
									<div className='mb-0.5 font-semibold'>
										<span className='text-3xl sm:text-5xl mr-2'>10</span>
										<span className='text-xl sm:text-2xl'>JUSD</span>
									</div>
									<div className='content-center'>
										<div>
											{scenarios1.map(({ name, scenario1 }) => (
												<button
													className='relative px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#2CB7BC] text-gray-100 opacity-75 hover:opacity-100'
													key={name}
													onClick={() => this.signTxnScenario(scenario1)}
												>
													{name}
												</button>
											))}
										</div>
									</div>
								</>
							)}
							{/* {!fetching ? <AccountAssets assets={assets} /> : <div />} */}
						</div>
					)}
				</div>
				<Modal show={showModal} toggleModal={this.toggleModal}>
					{pendingRequest ? (
						<div className='w-full relative break-words'>
							<div className='mt-1 mb-0 font-bold text-xl'>
								{'Pending Call Request'}
							</div>
							<div className='h-full min-h-2 flex flex-col justify-center items-center break-words'>
								<Loader />
								<p className='mt-8'>
									{'Approve or reject request using your wallet'}
								</p>
							</div>
						</div>
					) : result ? (
						<div className='w-full relative break-words'>
							<div className='mt-1 mb-0 font-bold text-xl'>
								{'Call Request Approved'}
							</div>
							<div className='flex flex-col text-left'>
								<div className='w-full flex mt-1 mb-0'>
									<div className='w-1/3 font-bold'>Method</div>
									<div className='w-2/3 font-mono'>{result.method}</div>
								</div>
								{result.body.map((signedTxns, index) => (
									<div className='w-full flex mt-1 mb-0' key={index}>
										<div className='w-1/3 font-bold'>{`Atomic group ${index}`}</div>
										<div className='w-2/3 font-mono'>
											{signedTxns.map((txn, txnIndex) => (
												<div key={txnIndex}>
													{!!txn?.txID && <p>TxID: {txn.txID}</p>}
													{!!txn?.signature && <p>Sig: {txn.signature}</p>}
													{!!txn?.signingAddress && (
														<p>AuthAddr: {txn.signingAddress}</p>
													)}
												</div>
											))}
										</div>
									</div>
								))}
							</div>
							<button
								className='relative px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#18393a] text-gray-100 opacity-100 hover:opacity-75'
								onClick={() => this.submitSignedTransaction()}
								disabled={pendingSubmissions.length !== 0}
							>
								{'Submit transaction to network.'}
							</button>
							{pendingSubmissions.map((submissionInfo, index) => {
								const key = `${index}:${
									typeof submissionInfo === 'number' ? submissionInfo : 'err'
								}`;
								const prefix = `Txn Group ${index}: `;
								let content: string;

								if (submissionInfo === 0) {
									content = 'Submitting...';
								} else if (typeof submissionInfo === 'number') {
									content = `Confirmed at round ${submissionInfo}`;
								} else {
									content =
										'Rejected by network. See console for more information.';
								}

								return (
									<div className='mt-1 mb-0 font-bold text-xl' key={key}>
										{prefix + content}
									</div>
								);
							})}
						</div>
					) : (
						<div className='w-full relative break-words'>
							<div className='mt-1 mb-0 font-bold text-xl'>
								{'Call Request Rejected'}
							</div>
						</div>
					)}
				</Modal>
			</div>
		);
	};
}

export default App;
