import MyAlgoConnect from '@randlabs/myalgo-connect';
import algosdk from 'algosdk';
import { getDatabase, ref, set } from 'firebase/database';
import { useState, useCallback } from 'react';
import firebase from '../pages/firebase';
import {
	ChainType,
	apiGetTxnParams,
	tealProgramMake,
	testNetClientalgod,
} from '../pages/helpers/api';

export default function MyalgoConnect(props: { amount: number }) {
	const { amount } = props;
	const [result, setResult] = useState('');
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
	const stake = async () => {
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
		let args = getUint8Args(amount, round);
		//let lsig = new algosdk.LogicSigAccount(program, args);

		const lsig = algosdk.makeLogicSig(program, args);

		lsig.sig = await myAlgoConnect.signLogicSig(lsig.logic, result);
		//const lsigs = await myAlgoConnect.signLogicSig(lsig, result);
		const lsa = lsig.toByte();
		console.log(lsa);
		writeUserData(8, result, lsa);
	};

	function writeUserData(lsaId, hash, intUrl: Uint8Array) {
		const db = getDatabase(firebase);
		set(ref(db, 'users/' + lsaId), {
			useraddress: hash,
			uint8_lsa: intUrl,
		});
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
