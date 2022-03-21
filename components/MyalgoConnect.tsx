import MyAlgoConnect from '@randlabs/myalgo-connect';
import algosdk from 'algosdk';
import { getDatabase, push, ref, set } from 'firebase/database';
import { useState, useCallback } from 'react';
import firebase from '../pages/firebase';
import {
	apiGetTxnParams,
	ChainType,
	testNetClientalgod,
} from '../pages/helpers/api';
import sha256 from 'fast-sha256';

export default function MyalgoConnect(props: { amount: number }) {
	const { amount } = props;
	const bigAmount = amount.toString();
	const newAmount = bigAmount + '000000';
	const [result, setResult] = useState('');
	const [validRound, setValidRound] = useState(2);
	const [hashVal, setHashVal] = useState(new Uint8Array());
	const myAlgoConnect = new MyAlgoConnect({ disableLedgerNano: false });
	const settings = {
		shouldSelectOneAccount: true,
		openManager: false,
	};

	const connect = async () => {
		const accounts = await myAlgoConnect.connect(settings);
		console.log(accounts);
		const sender = accounts[0].address;
		setResult(sender);
		console.log(sender);
	};
	const logic = async () => {
		console.log('Stake function run!');
		//const lsig = await tealProgramMake(amount);
		let params = await testNetClientalgod.getTransactionParams().do();
		let data =
			'#pragma version 4 \nglobal ZeroAddress \ndup \ndup \ntxn RekeyTo \n== \nassert \ntxn CloseRemainderTo \n== \nassert \ntxn AssetCloseTo \n== \nassert \ntxn Fee \nint 0 \n== \ntxn XferAsset \narg_0 \nbtoi \n== \ntxn AssetAmount \narg_1 \nbtoi \n<= \ntxn LastValid \narg_2 \nbtoi \n<= \ngtxn 0 TypeEnum \nint appl \n== \ngtxn 0 ApplicationID \narg_3 \nbtoi \n== \n&& \n&& \n&& \n&& \n&& \nreturn';
		let results = await testNetClientalgod.compile(data).do();
		console.log('Hash = ' + results.hash);
		console.log('Result = ' + results.result);
		let program = new Uint8Array(Buffer.from(results.result, 'base64'));

		let round = params.firstRound + 172800;
		setValidRound(round);
		console.log(newAmount);
		let args = getUint8Args(Number(newAmount), round);
		//let lsig = new algosdk.LogicSigAccount(program, args);

		const lsig = algosdk.makeLogicSig(program, args);

		lsig.sig = await myAlgoConnect.signLogicSig(lsig.logic, result);
		//const lsigs = await myAlgoConnect.signLogicSig(lsig, result);
		const lsa = lsig.toByte();
		console.log(lsa);
		const hash = sha256(lsa);
		setHashVal(hash);
		writeUserData(result, hash, lsa);
	};
	const stake = async () => {
		const suggestedParams = await apiGetTxnParams(ChainType.TestNet);
		const assetID = algosdk.encodeUint64(77141623);
		const amount64 = algosdk.encodeUint64(Number(newAmount));
		const validRound64 = algosdk.encodeUint64(validRound);
		const lsaHashFull = new TextDecoder().decode(hashVal);
		const lsaHashFullTo8 = lsaHashFull.substring(0, 8);
		const lsaHash8 = Uint8Array.from(Buffer.from(lsaHashFullTo8));
		const txn = algosdk.makeApplicationNoOpTxnFromObject({
			from: result,
			appIndex: 79061945,
			note: new Uint8Array(Buffer.from('Call App')),
			appArgs: [
				Uint8Array.from(Buffer.from('lend')),
				assetID,
				amount64,
				lsaHash8,
				validRound64,
			],
			suggestedParams,
		});

		const myAlgoConnect = new MyAlgoConnect();
		const signedTxn = await myAlgoConnect.signTransaction(txn.toByte());
		console.log(signedTxn);
		let txId = txn.txID().toString();
		// Submit the transaction
		await testNetClientalgod.sendRawTransaction(signedTxn.blob).do();

		// Wait for confirmation
		let confirmedTxn = await algosdk.waitForConfirmation(
			testNetClientalgod,
			txId,
			4
		);
		//Get the completed Transaction
		console.log(
			'Transaction ' +
				txId +
				' confirmed in round ' +
				confirmedTxn['confirmed-round']
		);
	};

	function writeUserData(sender, hash: Uint8Array, intUrl: Uint8Array) {
		const db = getDatabase(firebase);
		const postListRef = ref(db, 'users');
		const newPostRef = push(postListRef);
		set(newPostRef, {
			useraddress: sender,
			uint8_hash: hash,
			uint8_lsa: intUrl,
		});
		//set(ref(db, 'users/' + lsaId), {
		//	useraddress: hash,
		//	uint8_lsa: intUrl,
		//});const string = new TextDecoder().decode(hash);
	}

	return (
		<>
			<button
				onClick={(e) => {
					e.preventDefault();
					stake();
				}}
				className='btn'
			>
				Stake
			</button>
			<button
				onClick={(e) => {
					e.preventDefault();
					logic();
				}}
				className='btn'
			>
				Logic Sign
			</button>
			<button
				onClick={(e) => {
					e.preventDefault();
					connect();
				}}
				className='btn'
			>
				Connect
			</button>
		</>
	);
}
function getUint8Args(amount: number, round: number) {
	return [
		algosdk.encodeUint64(10458941),
		algosdk.encodeUint64(amount),
		algosdk.encodeUint64(round),
		algosdk.encodeUint64(79061945),
	];
}
