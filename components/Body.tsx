import Head from 'next/head';
import { CheckCircleIcon, XIcon } from '@heroicons/react/solid';
import { useCallback, useEffect, useRef, useState } from 'react';
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
} from '../pages/scenarios';
import {
	ChainType,
	apiGetTxnParams,
	apiSubmitTransactions,
	apiGetAccountAssets,
	tealProgramMake,
	tealProgramDispence,
} from '../pages/helpers/api';
import BalanceAsset from '../components/BalanceAsset';
import React from 'react';
import { formatJsonRpcRequest } from '@json-rpc-tools/utils';
import WalletConnect from '@walletconnect/client';
import Modal from './Modal';
import Loader from './Loader';
import AlgoSignerLsig from './AlgoSignerLsig';
//import { MyalgoLsig } from '../pages/index';
import firebase from '../pages/firebase';
import { collection, addDoc, getFirestore } from 'firebase/firestore';
import { child, get, getDatabase, ref, set } from 'firebase/database';
import MyalgoConnect from './MyalgoConnect';

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

const testAccounts = [algosdk.mnemonicToSecretKey('')];
function signTxnWithTestAccount(txn: algosdk.Transaction): Uint8Array {
	const sender = algosdk.encodeAddress(txn.from.publicKey);

	for (const testAccount of testAccounts) {
		if (testAccount.addr === sender) {
			let signedTxn = algosdk.signTransaction(txn, testAccount.sk);
			return signedTxn.blob;
		}
	}

	throw new Error(
		`Cannot sign transaction from unknown test account: ${sender}`
	);
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
const jusdAssetTransferTxn: Scenario = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);
	const transferAssetIndex = 79077841;
	const optInAssetIndex = transferAssetIndex;

	const txn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
		from: address,
		to: address,
		amount: 0,
		assetIndex: optInAssetIndex,
		note: new Uint8Array(Buffer.from('Opt-in to jUSD')),
		suggestedParams,
	});

	const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
		from: 'XCXQVUFRGYR5EKDHNVASR6PZ3VINUKYWZI654UQJ6GA5UVVUHJGM5QCZCY',
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
const LFTAssetTransferTxn: Scenario = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);

	const txn1 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
		from: address,
		to: address,
		amount: 0,
		assetIndex: 77141623,
		note: new Uint8Array(Buffer.from('Opt-in to LFT-Jina')),
		suggestedParams,
	});

	const txn2 = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
		from: 'XCXQVUFRGYR5EKDHNVASR6PZ3VINUKYWZI654UQJ6GA5UVVUHJGM5QCZCY',
		to: address,
		amount: 4,
		assetIndex: 77141623,
		note: new Uint8Array(Buffer.from('dispencer 4 LFT-Jina')),
		suggestedParams,
	});

	const txnsToSign = [{ txn: txn1 }, { txn: txn2, signers: [] }];

	algosdk.assignGroupID(txnsToSign.map((toSign) => toSign.txn));
	return [txnsToSign];
};
const scenarios1: Array<{ name: string; scenario1: Scenario }> = [
	{
		name: 'Dispense',
		scenario1: jusdAssetTransferTxn,
	},
];
const scenarios2: Array<{ name: string; scenario1: Scenario }> = [
	{
		name: 'Dispense',
		scenario1: LFTAssetTransferTxn,
	},
];
const scenarios: Array<{ name: string; scenario1: Scenario }> = [
	{
		name: 'Repay',
		scenario1: singleAssetOptInTxn,
	},
];
const singleAppOptIn: Scenario = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);

	const appIndex = 77600054;
	const assetID = algosdk.encodeUint64(77141623);
	const amount = algosdk.encodeUint64(3);
	// change appIndex to BigEndian
	const txn = algosdk.makeApplicationOptInTxnFromObject({
		from: address,
		appIndex,
		note: new Uint8Array(Buffer.from('OptIn App')),
		appArgs: [Uint8Array.from(Buffer.from('borrow')), assetID, amount],
		suggestedParams,
	});

	const txnsToSign = [{ txn }];
	return [txnsToSign];
};
const singleAppCall: Scenario = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);

	const appIndex = 77600054;
	const assetID = algosdk.encodeUint64(77141623);
	const amount = algosdk.encodeUint64(3);

	const txn = algosdk.makeApplicationNoOpTxnFromObject({
		from: address,
		appIndex,
		appArgs: [Uint8Array.from(Buffer.from('borrow'))],
		accounts: [
			'HKOTQQU55JPUPJZLXIEXSITGGFIIGVCZXLT62XZ4EIOPKIAXRNINXAMJTI',
			'KT6BXV32VUWBKJPFWYJOUHQEOIRHWTL2CONOVF5SANY4INGA73UGATOWPI',
		],
		foreignAssets: [77141623, 71360698],
		suggestedParams,
	});

	const txnsToSign = [{ txn }];
	return [txnsToSign];
};

export default function Body(props: {
	assets: IAssetData[];
	connector: WalletConnect;
	address: string;
	chain: ChainType;
}) {
	const { assets, connector, address, chain } = props;
	//console.log(lsa);
	//let str = JSON.stringify(lsa, null, 0);
	//let lsaByte = algosdk.encodeObj(lsa);
	//console.log(lsaByte);
	async function firebaseFirestore() {
		try {
			const db = getFirestore();
			const docRef = await addDoc(collection(db, 'users'), {
				first: 'Ada',
				last: 'Lovelace',
				born: 1815,
			});
			console.log('Document written with ID: ', docRef.id);
		} catch (e) {
			console.error('Error adding document: ', e);
		}
	}
	const [makeLogicSig, setMakeLogicSig] = useState(new Uint8Array());
	const [jusdLogicSig, setJusdLogicSig] = useState(new Uint8Array());

	function writeUserData(userId, name, email, imageUrl: Uint8Array) {
		const db = getDatabase(firebase);
		set(ref(db, 'users/' + userId), {
			username: name,
			email: email,
			profile_picture: imageUrl,
		});
	}
	function readUserData(userId: Number): Uint8Array {
		const dbRef = ref(getDatabase(firebase));
		get(child(dbRef, `users/${userId}`))
			.then((snapshot) => {
				if (snapshot.exists()) {
					console.log(snapshot.val().profile_picture);
					let myval: Uint8Array = snapshot.val().profile_picture;
					if (userId === 2) {
						setMakeLogicSig(myval);
					}
					if (userId === 1) {
						setJusdLogicSig(myval);
					}
					//console.log(makeLogicSig);
				} else {
					console.log('No data available');
					return;
				}
			})
			.catch((error) => {
				console.error(error);
			});
		return makeLogicSig;
	}
	useEffect(() => {
		readUserData(2);
		readUserData(1);
	}, []);
	function selectLogicSigDispence(txn: algosdk.Transaction): Uint8Array {
		if (txn.assetIndex === 77141623) {
			return makeLogicSig;
		} else if (txn.assetIndex === 79077841) {
			return jusdLogicSig;
		}
		return makeLogicSig;
	}

	function signTxnLogicSigWithTestAccount(
		txn: algosdk.Transaction
	): Uint8Array {
		const sender = 'XCXQVUFRGYR5EKDHNVASR6PZ3VINUKYWZI654UQJ6GA5UVVUHJGM5QCZCY';
		let lsa = selectLogicSigDispence(txn);
		//let lsa = makeLogicSig;
		console.log('Final' + lsa);

		if (txn.assetIndex === 77141623) {
			let lsig = algosdk.LogicSigAccount.fromByte(lsa);
			let signedTxn = algosdk.signLogicSigTransactionObject(txn, lsig);
			console.log(signedTxn.txID);
			return signedTxn.blob;
		} else if (txn.assetIndex === 79077841) {
			let lsig = algosdk.LogicSigAccount.fromByte(lsa);
			let signedTxn = algosdk.signLogicSigTransactionObject(txn, lsig);
			console.log(signedTxn.txID);
			return signedTxn.blob;
		}

		throw new Error(
			`Cannot sign transaction from unknown test account: ${sender}`
		);
	}
	const LOFTYtoken = assets.find(
		(asset: IAssetData) => asset && asset.id === 77141623
	) || {
		id: 77141623,
		amount: BigInt(0),
		creator: '',
		frozen: false,
		decimals: 0,
		name: 'Lofty jina property',
		unitName: 'LFT-jina',
	};
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
		(asset: IAssetData) => asset && asset.id === 79077841
	);
	const JINAtoken = assets.find(
		(asset: IAssetData) => asset && asset.id === 79077841
	) || {
		id: 79077841,
		amount: BigInt(0),
		creator: '',
		frozen: false,
		decimals: 6,
		name: 'jUSD',
		unitName: 'jUSD',
	};

	const router = useRouter();
	const searchInputRef = useRef(null);
	const [userInput, setUserInput] = useState(0);

	async function maximumAmount(
		tokenAsset: IAssetData,
		tokenType: number,
		Bodyamounts: string
	) {
		focus();
		if (!Bodyamounts) {
			setUserInput(
				Number(formatBigNumWithDecimals(tokenAsset.amount, tokenAsset.decimals))
			);
			return;
		}
		setUserInput(Number(Bodyamounts));
		await LatestValue(address, chain, tokenType);
		return;
	}
	function Borrow(e) {
		e.preventDefault();
		console.log('Borrow function run!');
		// Check indexer
		// if ()
		signTxnScenario(singleAppOptIn, connector, address, chain, 0);
	}
	function increaseBorrow(e) {
		e.preventDefault();
		console.log('increaseBorrow function run!');
	}
	function Repay(e) {
		e.preventDefault();
		console.log('Repay function run!');
	}
	async function stake() {
		console.log('Stake function run!');
		//let lsa = await MyalgoLsig(10000000);

		let lsa = await tealProgramDispence(77141623, 4);
		console.log(lsa);
		writeUserData(9, 'Staker', 'USDC', lsa);
		// After reading
		//const lsigs = algosdk.LogicSigAccount.fromByte(lsa);

		//let lsa1 = readUserData(5);
		//console.log(lsa1);
		//let alsig = algosdk.LogicSigAccount.fromByte(lsa1);

		//let aa = alsig.toByte();
		//writeUserData(7, 'jina', 'dora', aa);
		//setMakeLogicSig(newAmount2);
		//const logicSigAmount = Number(makeLogicSig);
		//const lsa = await tealProgramMake(logicSigAmount);
		//const suggestedParams = await apiGetTxnParams(ChainType.TestNet);
		// send to database

		// build txns
		//algosdk.signLogicSigTransactionObject(txn,lsig)
	}
	function claimUSDC(e) {
		e.preventDefault();
		console.log('Claim function run!');
	}
	function focus() {
		searchInputRef.current.focus();
	}
	function borrowAmount(valmy: Number) {
		if (!valmy || valmy < 0) {
			return 0;
		}

		const val = Number(valmy) * 50;
		const fee = (3 / 100) * val;
		const overCollateralized = (10 / 100) * val;
		//console.log('Fee: ' + fee + ' overCollateral: ' + overCollateralized);
		const calculated = val - fee - overCollateralized;
		return calculated;
	}
	const [openTab, setOpenTab] = React.useState(1);
	const [showModal, setShowModal] = useState(false);
	const [result, setResult] = useState<IResult | null>(null);
	const [pendingRequest, setPendingRequest] = useState(false);
	const [pendingSubmissions, setPendingSubmissions] = useState([]);
	const [newAmount, setNewAmount] = useState('');
	const [newAmount2, setNewAmount2] = useState('');
	const [newAmount3, setNewAmount3] = useState('');
	const [dataLogicSig, setDataLogicSig] = useState([]);
	useEffect(() => {
		console.log('render');
		//loadData();
		makeLogic();
		//console.log(dataLogicSig);
		return () => {
			console.log('return from change, CleanUP');
		};
	}, [userInput]);
	/*
	{dataLogicSig.map((record) => {
					<div key={record.id}>
						{record.userId}, {record.title}
					</div>;
				})}
	*/

	const loadData = async () => {
		const api = `https://jsonplaceholder.typicode.com/posts`;
		const result = await fetch(api);
		const getResult = await result.json();
		setDataLogicSig(getResult);
		//await tealProgramMake(100000000);
	};
	const makeLogic = async () => {
		//const api = `https://jsonplaceholder.typicode.com/posts`;
		//const result = await fetch(api);
		//const getResult = await result.json();
		//setDataLogicSig(getResult);
		//await tealProgramMake(100000000);
	};
	async function LatestValue(
		address: string,
		chain: ChainType,
		tokenType: Number
	) {
		try {
			const Myassets = await apiGetAccountAssets(chain, address);
			if (tokenType === 0) {
				const LOFTYtoken1 = Myassets.find(
					(asset: IAssetData) => asset && asset.id === 77141623
				) || {
					id: 77141623,
					amount: BigInt(0),
					creator: '',
					frozen: false,
					decimals: 0,
					name: 'Lofty jina property',
					unitName: 'LFT-jina',
				};
				if (!LOFTYtoken1) {
					return;
				}
				console.log('Found LFT!');
				const Myval = formatBigNumWithDecimals(
					LOFTYtoken1.amount,
					LOFTYtoken1.decimals
				);
				console.log('New Value: ' + Myval);
				setNewAmount(Myval);
				return;
			}
			if (tokenType === 1) {
				const USDCtoken1 = Myassets.find(
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
				if (!USDCtoken1) {
					return;
				}
				console.log('Found USDC!');
				const Myval = formatBigNumWithDecimals(
					USDCtoken1.amount,
					USDCtoken1.decimals
				);
				console.log('New Value: ' + Myval);
				setNewAmount2(Myval);
				return;
			}
			if (tokenType === 2) {
				const JINAtoken1 = Myassets.find(
					(asset: IAssetData) => asset && asset.id === 79077841
				) || {
					id: 79077841,
					amount: BigInt(0),
					creator: '',
					frozen: false,
					decimals: 6,
					name: 'jUSD',
					unitName: 'jUSD',
				};
				if (!JINAtoken1) {
					return;
				}
				console.log('Found JUSD!');
				const Myval = formatBigNumWithDecimals(
					JINAtoken1.amount,
					JINAtoken1.decimals
				);
				console.log('New Value: ' + Myval);
				setNewAmount3(Myval);
				return;
			}
		} catch (error) {
			console.log('Error');
		}
	}

	const toggleModal = () => {
		setShowModal(!showModal);
		setPendingSubmissions([]);
	};

	async function signTxnScenario(
		scenario1: Scenario,
		connector: WalletConnect,
		address: string,
		chain: ChainType,
		tokenType: Number
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
							console.log('Signed ONLY with WALLETCONNECT!');
							return stxn;
						}
						console.log('Signing with TestAccount!');
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
					await LatestValue(address, chain, tokenType);
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
	async function signTxnLogic(
		scenario1: Scenario,
		connector: WalletConnect,
		address: string,
		chain: ChainType,
		tokenType: Number
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

						return signTxnLogicSigWithTestAccount(
							txnsToSign[group][groupIndex].txn
						);
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
					await LatestValue(address, chain, tokenType);
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

								setUserInput(0);
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
								setUserInput(0);
							}}
						>
							Repay
						</a>
						<a
							className={`last:pr-24 border-b-2 border-transparent pb-0.5 cursor-pointer transition duration-100 transform hover:scale-105 hover:text-indigo-500 hover:border-indigo-500 ${
								openTab === 3 && 'text-indigo-500 border-indigo-500'
							}`}
							onClick={(e) => {
								e.preventDefault();
								setOpenTab(3);
								setUserInput(0);
							}}
						>
							Earn
						</a>
						<a
							className={` border-b-2 border-transparent pb-0.5 cursor-pointer transition duration-100 transform hover:scale-105 hover:text-indigo-500 hover:border-indigo-500 ${
								openTab === 4 && 'text-indigo-500 border-indigo-500'
							}`}
							onClick={(e) => {
								e.preventDefault();
								setOpenTab(4);
								setUserInput(0);
							}}
						>
							Claim
						</a>
					</div>
				</nav>
				{openTab === 1 && (
					<>
						<BalanceAsset
							key={LOFTYtoken.id}
							asset={LOFTYtoken}
							Bodyamount={newAmount}
						/>
					</>
				)}
				{openTab === 2 && (
					<BalanceAsset
						key={USDCtoken.id}
						asset={USDCtoken}
						Bodyamount={newAmount2}
					/>
				)}
				{openTab === 3 && (
					<BalanceAsset
						key={USDCtoken.id}
						asset={USDCtoken}
						Bodyamount={newAmount2}
					/>
				)}
				{openTab === 4 &&
					tokens.map((token) => (
						<BalanceAsset
							key={token.id}
							asset={token}
							Bodyamount={newAmount3}
						/>
					))}
				{/* <Tabs color='blue' /> */}
				<form className='flex w-full mt-5 hover:shadow-lg focus-within:shadow-lg max-w-md rounded-full border border-gray-200 px-5 py-3 items-center sm:max-w-xl lg:max-w-2xl'>
					<p className='relative px-7 py-2 rounded-md leading-none flex items-center divide-x divide-gray-500'>
						{openTab === 1 && (
							<>
								<span
									className='pr-2 text-indigo-400 cursor-pointer hover:text-pink-600 transition duration-200'
									onClick={(e) => {
										e.preventDefault();
										maximumAmount(LOFTYtoken, 0, newAmount);
									}}
								>
									MAX
								</span>
								<span className='pl-2 text-gray-500'>LFT-jina</span>
							</>
						)}
						{openTab === 2 && (
							<>
								<span
									className='pr-2 text-indigo-400 cursor-pointer hover:text-pink-600 transition duration-200'
									onClick={(e) => {
										e.preventDefault();
										maximumAmount(USDCtoken, 1, newAmount2);
									}}
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
									onClick={(e) => {
										e.preventDefault();
										maximumAmount(USDCtoken, 1, newAmount2);
									}}
								>
									MAX
								</span>
								<span className='pl-2 text-gray-500'>USDC</span>
							</>
						)}
						{openTab === 4 && (
							<>
								<span
									className='pr-2 text-indigo-400 cursor-pointer hover:text-pink-600 transition duration-200'
									onClick={(e) => {
										e.preventDefault();
										maximumAmount(JINAtoken, 2, newAmount3);
									}}
								>
									MAX
								</span>
								<span className='pl-2 text-gray-500'>JUSD</span>
							</>
						)}
					</p>
					<input
						ref={searchInputRef}
						type='number'
						className='flex-grow focus:outline-none bg-[#FAFAFA]'
						value={userInput}
						onChange={(e) => setUserInput(Number(e.target.value))}
					/>
					<XIcon
						className='h-5 sm:mr-3 text-gray-500 cursor-pointer transition duration-100 transform hover:scale-125'
						onClick={() => setUserInput(0)}
					/>
					{openTab === 1 && (
						<button hidden type='submit' onClick={Borrow}>
							{' '}
							Borrow{' '}
						</button>
					)}
					{openTab === 2 && (
						<button hidden type='submit' onClick={Repay}>
							{' '}
							repay{' '}
						</button>
					)}
					{openTab === 3 && (
						<>
							<button hidden type='submit' onClick={stake}>
								{' '}
								stake{' '}
							</button>
						</>
					)}
					{openTab === 4 && (
						<button hidden type='submit' onClick={claimUSDC}>
							{' '}
							claim{' '}
						</button>
					)}
				</form>
				{openTab === 1 && (
					<>
						<span className='pr-2 text-indigo-400'>
							USDC {`${borrowAmount(userInput)}`}
							{/* <p ref={algoInputRef} className='text-pink-600'>
									{`${formatBigNumWithDecimals(
										USDCtoken.amount,
										USDCtoken.decimals
									)} ${USDCtoken.unitName || 'units'}`}{' '}
								</p> */}
						</span>

						<div className='flex flex-col w-1/2 space-y-2 justify-center mt-7 sm:space-y-0 sm:flex-row sm:space-x-4'>
							<button onClick={Borrow} className='btn'>
								Borrow
							</button>
							<button
								onClick={(e) => {
									e.preventDefault();
									LatestValue(address, chain, 0);
								}}
								className='btn'
							>
								Increase Collateral
							</button>
						</div>
					</>
				)}
				{/* className='relative px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#18393a] text-gray-100' */}
				{openTab === 2 && (
					<div className='flex flex-col w-1/2 space-y-2 justify-center mt-8 sm:space-y-0 sm:flex-row sm:space-x-4'>
						{scenarios.map(({ name, scenario1 }) => (
							<button
								className='btn'
								key={name}
								onClick={(e) => {
									e.preventDefault();
									signTxnScenario(scenario1, connector, address, chain, 1);
								}}
							>
								{name}
							</button>
						))}
					</div>
				)}
				{openTab === 3 && (
					<div className='flex flex-col w-1/2 space-y-2 justify-center mt-8 sm:space-y-0 sm:flex-row sm:space-x-4'>
						<button
							onClick={(e) => {
								e.preventDefault();
								stake();
								LatestValue(address, chain, 1);
							}}
							className='btn'
						>
							Stake
						</button>
						{/* <AlgoSignerLsig /> */}
						<MyalgoConnect amount={10000000} />
					</div>
				)}
				{openTab === 4 && (
					<div className='flex flex-col w-1/2 space-y-2 justify-center mt-8 sm:space-y-0 sm:flex-row sm:space-x-4'>
						<button onClick={claimUSDC} className='btn'>
							Claim USDC
						</button>
					</div>
				)}
			</form>
			{openTab === 4 && (
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
											onClick={(e) => {
												e.preventDefault();
												signTxnLogic(scenario1, connector, address, chain, 2);
											}}
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
											onClick={(e) => {
												e.preventDefault();
												signTxnLogic(scenario1, connector, address, chain, 2);
											}}
										>
											{name}
										</button>
									))}
								</div>
							</div>
						</>
					)}
				</div>
			)}
			{openTab === 1 && (
				<div className='flex w-full max-w-2xl items-center justify-evenly sm:w-48 sm:flex-wrap bg-white rounded-lg shadow-md p-6 fixed bottom-0 mt-4 hover:cursor-pointer group'>
					{/* {!fetching ? <AccountAssets assets={assets} /> : <div />} */}
					{LOFTYtoken && LOFTYtoken.amount > 3 ? (
						<>
							<div className='flex justify-between items-center'>
								<h1 className='uppercase text-sm sm:text-base tracking-wide'>
									Dispencer
								</h1>
								<div>
									<CheckCircleIcon className='h-4 sm:h-5 sm:mr-3 text-gray-500 cursor-pointer transition duration-100 transform hover:scale-125' />
									<span className='absolute w-auto p-2 m-2 min-w-max left-48 rounded-md text-white bg-gray-900 text-xs font-bold transition-all duration-100 scale-0 origin-left group-hover:scale-100'>
										You already have LFT-Jina!
									</span>
								</div>
							</div>
							<div className='mb-0.5 font-semibold'>
								<span className='text-3xl sm:text-5xl mr-2'>4</span>
								<span className='text-xl sm:text-2xl'>LFT-Jina</span>
							</div>
							<div className='content-center'>
								<div>
									{scenarios2.map(({ name, scenario1 }) => (
										<button
											className='relative px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#18393a] text-gray-100'
											key={name}
											onClick={(e) => {
												e.preventDefault();
												signTxnLogic(scenario1, connector, address, chain, 0);
												//signTxnScenario(scenario1, connector, address, chain);
											}}
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
								<span className='text-3xl sm:text-5xl mr-2'>4</span>
								<span className='text-xl sm:text-2xl'>LFT-Jina</span>
							</div>
							<div className='content-center'>
								<div>
									{scenarios2.map(({ name, scenario1 }) => (
										<button
											className='relative px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#2CB7BC] text-gray-100 opacity-75 hover:opacity-100'
											key={name}
											onClick={(e) => {
												e.preventDefault();
												signTxnLogic(scenario1, connector, address, chain, 0);
											}}
										>
											{name}
										</button>
									))}
								</div>
							</div>
						</>
					)}
				</div>
			)}
			{openTab === 3 && (
				<div className='flex w-full max-w-2xl items-center justify-evenly sm:w-48 sm:flex-wrap bg-white rounded-lg shadow-md p-6 fixed bottom-0 mt-4 hover:cursor-pointer group'>
					<div className='flex justify-between items-center'>
						<h1 className='uppercase text-sm sm:text-base tracking-wide'>
							Dispencer
						</h1>
					</div>
					<div className='mb-0.5 font-semibold'>
						<span className='text-3xl sm:text-5xl mr-2'>100</span>
						<span className='text-xl sm:text-2xl'>USDC</span>
					</div>
					<div className='content-center'>
						<div>
							<a
								target='_blank'
								href='https://dispenser.testnet.aws.algodev.network/'
								rel='noopener noreferrer'
								onClick={() => {
									"document.getElementByName('account').value='PROAQSK6TQLWFIAGW3J7N7JBFXHL73S6IQXUXWQTBUVP56RGGE6YSGYBVA';";
								}}
								className='relative px-6 py-1 sm:px-7 sm:py-2 rounded-md leading-none flex items-center bg-[#2CB7BC] text-gray-100 opacity-75 hover:opacity-100'
							>
								Go
							</a>
						</div>
					</div>
				</div>
			)}

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
