import Head from 'next/head';
import Nav from '../components/Nav';
import { XIcon } from '@heroicons/react/solid';
import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import { formatBigNumWithDecimals } from '../pages/helpers/utilities';
import {
	IAssetData,
	IWalletTransaction,
	SignTxnParams,
} from '../pages/helpers/types';
import algosdk from 'algosdk';
import {
	ScenarioReturnType,
	Scenario,
	AssetTransactionType,
	signTxnWithTestAccount,
} from '../pages/scenarios';
import {
	ChainType,
	apiGetTxnParams,
	apiSubmitTransactions,
} from '../pages/helpers/api';
import BalanceAsset from '../components/BalanceAsset';
import React from 'react';
import { formatJsonRpcRequest } from '@json-rpc-tools/utils';
import WalletConnect from '@walletconnect/client';
import Modal from './Modal';
import Loader from './Loader';

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

const testAccounts = [
	algosdk.mnemonicToSecretKey(
		'cannon scatter chest item way pulp seminar diesel width tooth enforce fire rug mushroom tube sustain glide apple radar chronic ask plastic brown ability badge'
	),
];

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
const singleAssetOptInTxn: Scenario = async (
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
/*const scenarios: Array<{ name: string; scenario1: Scenario }> = [
	{
		name: 'Stake',
		scenario1: singleAssetOptInTxn,
	},
];
const toggleModal = () =>
		setModal({
			showModal: !showModal,
			pendingSubmissions: [],
		});
*/
const scenarios: Array<{ name: string; scenario1: Scenario }> = [
	{
		name: 'Repay',
		scenario1: singleAssetOptInTxn,
	},
];

export default function Body(props: {
	assets: IAssetData[];
	connector: WalletConnect;
	address: string;
	chain: ChainType;
}) {
	const { assets, connector, address, chain } = props;

	const nativeCurrency = assets.find(
		(asset: IAssetData) => asset && asset.id === 0
	) || {
		id: 0,
		amount: BigInt(0),
		creator: '',
		frozen: false,
		decimals: 6,
		name: 'Algo',
		unitName: 'Algo',
	};
	const USDCtoken = assets.find(
		(asset: IAssetData) => asset && asset.id === 10458941
	) || {
		id: 10458941,
		amount: BigInt(0),
		creator: '',
		frozen: false,
		decimals: 6,
		name: 'usdc',
		unitName: 'USDC',
	};
	const tokens = assets.filter(
		(asset: IAssetData) => asset && asset.id === 71360698
	);
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

	const router = useRouter();
	const searchInputRef = useRef(null);
	const algoInputRef = useRef(null);

	const {
		query: { tab },
	} = router;
	const isTabOne = tab === '1' || tab == null;
	const isTabTwo = tab === '2';
	const isTabThree = tab === '3';
	const [openTab, setOpenTab] = React.useState(1);
	const [showModal, setShowModal] = useState(false);
	const [result, setResult] = useState<IResult | null>(null);
	const [pendingRequest, setPendingRequest] = useState(false);
	const [pendingSubmissions, setPendingSubmissions] = useState([]);

	const toggleModal = () => {
		setShowModal(!showModal);
		setPendingSubmissions([]);
	};

	async function signTxnScenario(
		scenario1: Scenario,
		connector: WalletConnect,
		address: string,
		chain: ChainType
	) {
		if (!connector) {
			console.log('No connector found!');
			return;
		}

		try {
			const txnsToSign = await scenario1(chain, address);
			console.log(txnsToSign);
			// open modal
			toggleModal();
			//setToggleModal(showModal)

			// toggle pending request indicator
			//this.setState({ pendingRequest: true });
			setPendingRequest(true);

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
			//console.log('Request param:', request);
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
			setPendingRequest(false);
			setResult(formattedResult);

			setPendingSubmissions(signedTxns.map(() => 0));
			signedTxns.forEach(async (signedTxn, index) => {
				try {
					const confirmedRound = await apiSubmitTransactions(chain, signedTxn);

					setPendingSubmissions((prevPendingSubmissions) =>
						prevPendingSubmissions.map((v, i) => {
							if (index === i) {
								return confirmedRound;
							}
							return v;
						})
					);
					console.log(`Transaction confirmed at round ${confirmedRound}`);
				} catch (err) {
					setPendingSubmissions((prevPendingSubmissions) =>
						prevPendingSubmissions.map((v, i) => {
							if (index === i) {
								return err;
							}
							return v;
						})
					);
					console.error(`Error submitting transaction: `, err);
				}
			});
		} catch (error) {
			console.error(error);
			setPendingRequest(false);
			setResult(null);
		}
	}

	const search = (e) => {
		e.preventDefault();
		const term = searchInputRef.current.value;

		if (!term) return;
		router.push(`/?term=${term}`);
	};

	return (
		<div>
			<Head>
				<title>Jina</title>
				<meta name='description' content='Generated by create next app' />
				<link rel='icon' href='/favicon.ico' />
			</Head>

			{/* Body component */}
			<form className='flex flex-col items-center mt-16 flex-grow'>
				{/* Nav */}
				<nav className='relative border-b'>
					<div className='flex px-10 sm:px-20 text-2xl whitespace-nowrap space-x-10 sm:space-x-20  '>
						<a
							className={`last:pr-24 border-b-2 border-transparent pb-0.5 cursor-pointer transition duration-100 transform hover:scale-105 hover:text-indigo-500 hover:border-indigo-500 ${
								openTab === 1 && 'text-indigo-500 border-indigo-500'
							}`}
							onClick={(e) => {
								e.preventDefault();
								setOpenTab(1);

								searchInputRef.current.value = '0';
							}}
						>
							Borrow
						</a>

						<a
							className={`last:pr-24 border-b-2 border-transparent pb-0.5 cursor-pointer transition duration-100 transform hover:scale-105 hover:text-indigo-500 hover:border-indigo-500 ${
								openTab === 2 && 'text-indigo-500 border-indigo-500'
							}`}
							onClick={(e) => {
								e.preventDefault();
								setOpenTab(2);
								searchInputRef.current.value = '0';
							}}
						>
							Earn
						</a>
						<a
							className={` border-b-2 border-transparent pb-0.5 cursor-pointer transition duration-100 transform hover:scale-105 hover:text-indigo-500 hover:border-indigo-500 ${
								openTab === 3 && 'text-indigo-500 border-indigo-500'
							}`}
							onClick={(e) => {
								e.preventDefault();
								setOpenTab(3);
								searchInputRef.current.value = '0';
							}}
						>
							Claim
						</a>
					</div>
				</nav>
				{openTab === 1 && (
					<>
						<BalanceAsset key={nativeCurrency.id} asset={nativeCurrency} />
					</>
				)}
				{openTab === 2 && <BalanceAsset key={USDCtoken.id} asset={USDCtoken} />}
				{openTab === 3 &&
					tokens.map((token) => <BalanceAsset key={token.id} asset={token} />)}
				{/* <Tabs color='blue' /> */}
				<form className='flex w-full mt-5 hover:shadow-lg focus-within:shadow-lg max-w-md rounded-full border border-gray-200 px-5 py-3 items-center sm:max-w-xl lg:max-w-2xl'>
					<p className='relative px-7 py-2 rounded-md leading-none flex items-center divide-x divide-gray-500'>
						{openTab === 1 && (
							<>
								<span
									className='pr-2 text-indigo-400 cursor-pointer hover:text-pink-600 transition duration-200'
									onClick={() =>
										(searchInputRef.current.value = `${formatBigNumWithDecimals(
											nativeCurrency.amount,
											nativeCurrency.decimals
										)}`)
									}
								>
									MAX
								</span>
								<span className='pl-2 text-gray-500'>ALGO</span>
							</>
						)}
						{openTab === 2 && (
							<>
								<span
									className='pr-2 text-indigo-400 cursor-pointer hover:text-pink-600 transition duration-200'
									onClick={() =>
										(searchInputRef.current.value = `${formatBigNumWithDecimals(
											USDCtoken.amount,
											USDCtoken.decimals
										)}`)
									}
								>
									MAX
								</span>
								<span className='pl-2 text-gray-500'>USDC</span>
							</>
						)}
						{openTab === 3 && (
							<>
								<span
									className='pr-2 text-indigo-400 cursor-pointer hover:text-pink-600 transition duration-200'
									onClick={() =>
										(searchInputRef.current.value = `${formatBigNumWithDecimals(
											JINAtoken.amount,
											JINAtoken.decimals
										)}`)
									}
								>
									MAX
								</span>
								<span className='pl-2 text-gray-500'>JINA</span>
							</>
						)}
					</p>
					<input
						ref={searchInputRef}
						type='number'
						className='flex-grow focus:outline-none bg-[#FAFAFA]'
					/>
					<XIcon
						className='h-5 sm:mr-3 text-gray-500 cursor-pointer transition duration-100 transform hover:scale-125'
						onClick={() => (searchInputRef.current.value = '')}
					/>
					<button hidden type='submit' onClick={search}>
						Search
					</button>
				</form>
				{openTab === 1 && (
					<>
						<span className='pr-2 text-indigo-400'>
							USDC{' '}
							{`${formatBigNumWithDecimals(
								nativeCurrency.amount,
								nativeCurrency.decimals
							)}`}
							{/* <p ref={algoInputRef} className='text-pink-600'>
									{`${formatBigNumWithDecimals(
										USDCtoken.amount,
										USDCtoken.decimals
									)} ${USDCtoken.unitName || 'units'}`}{' '}
								</p> */}
						</span>

						<div className='flex flex-col w-1/2 space-y-2 justify-center mt-7 sm:space-y-0 sm:flex-row sm:space-x-4'>
							<button onClick={search} className='btn'>
								Borrow
							</button>
							<button onClick={search} className='btn'>
								Increase Collateral
							</button>
						</div>
					</>
				)}
				{/* className='relative px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#18393a] text-gray-100' */}
				{openTab === 2 && (
					<div className='flex flex-col w-1/2 space-y-2 justify-center mt-8 sm:space-y-0 sm:flex-row sm:space-x-4'>
						<button onClick={search} className='btn'>
							Stake
						</button>
						{scenarios.map(({ name, scenario1 }) => (
							<button
								className='btn'
								key={name}
								onClick={(e) => {
									e.preventDefault();
									signTxnScenario(scenario1, connector, address, chain);
								}}
							>
								{name}
							</button>
						))}
					</div>
				)}
				{openTab === 3 && (
					<div className='flex flex-col w-1/2 space-y-2 justify-center mt-8 sm:space-y-0 sm:flex-row sm:space-x-4'>
						<button onClick={search} className='btn'>
							Claim USDC
						</button>
					</div>
				)}
			</form>
			{/* Footer */}
			<Modal show={showModal} toggleModal={toggleModal}>
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
								<>
									<div className='flex flex-col text-left'>
										{result.body.map((signedTxns, index) => (
											<div className='w-full flex mt-1 mb-0' key={index}>
												<div className='w-1/6 font-bold'>{`TxID: `}</div>
												<div className='w-10/12 font-mono'>
													{signedTxns.map((txn, txnIndex) => (
														<div key={txnIndex}>
															{!!txn?.txID && <p>{txn.txID}</p>}
														</div>
													))}
												</div>
											</div>
										))}
									</div>
									<div className='mt-1 mb-0 font-bold text-xl' key={key}>
										{content}
									</div>
								</>
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
}
// {/* Footer */}<Body assets={assets} signtxn={this.signTxnScenario}/>
