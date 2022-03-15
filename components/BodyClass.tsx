import { formatJsonRpcRequest } from '@json-rpc-tools/utils';
import WalletConnect from '@walletconnect/client';
import algosdk from 'algosdk';
import React from 'react';
import { apiSubmitTransactions, ChainType } from '../pages/helpers/api';
import {
	IAssetData,
	IWalletTransaction,
	SignTxnParams,
} from '../pages/helpers/types';
import { Scenario } from '../pages/scenarios';

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
const testAccounts = [
	algosdk.mnemonicToSecretKey(
		'excuse help topic once acoustic decline stock insane convince dove debate main bullet violin guess anchor salt account spin unaware grain modify install absent account'
	),
];

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
export default class BodyClass extends React.Component<unknown, IAppState> {
	public state: IAppState = {
		...INITIAL_STATE,
	};

	public toggleModal = () =>
		this.setState({
			showModal: !this.state.showModal,
			pendingSubmissions: [],
		});

	public signTxnScenario = async (scenario1: Scenario) => {
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
}
