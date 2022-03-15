import { useState, useCallback } from 'react';
import algosdk from 'algosdk';
import {
	ChainType,
	apiGetTxnParams,
	apiSubmitTransactions,
} from '../pages/helpers/api';
import lsa from '../public/lsa.json';

const appId = 13793863;

const ExampleAlgoSigner = ({ title, buttonText, buttonAction }) => {
	const [result, setResult] = useState('');

	const onClick = useCallback(async () => {
		const r = await buttonAction();
		setResult(r);
	}, [buttonAction]);

	return (
		<>
			<header>{title}</header>
			<button onClick={onClick}>{buttonText}</button>
			<h2>{result}</h2>
		</>
	);
};
// The following components are all demonstrating some features of AlgoSigner

const CheckAlgoSigner = () => {
	const action = useCallback(() => {
		if (typeof AlgoSigner !== 'undefined') {
			return 'AlgoSigner is installed.';
		} else {
			return 'AlgoSigner is NOT installed.';
		}
	}, []);

	return (
		<ExampleAlgoSigner
			title='CheckAlgoSigner'
			buttonText='Check'
			buttonAction={action}
		/>
	);
};

const GetAccounts = () => {
	const action = useCallback(async () => {
		await AlgoSigner.connect({
			ledger: 'TestNet',
		});
		const accts = await AlgoSigner.accounts({
			ledger: 'TestNet',
		});
		return JSON.stringify(accts, null, 2);
	}, []);
	return (
		<ExampleAlgoSigner
			title='Get Accounts'
			buttonText='Accounts'
			buttonAction={action}
		/>
	);
};
const ConnectAlgoSigner = () => {
	const action = useCallback(async () => {
		try {
			const r = await AlgoSigner.connect();
			return JSON.stringify(r, null, 2);
		} catch (e) {
			console.error(e);
			return JSON.stringify(e, null, 2);
		}
	}, []);

	return (
		<ExampleAlgoSigner
			title='Connect to AlgoSigner'
			buttonText='Connect'
			buttonAction={action}
		/>
	);
};

const CreateTransaction = () => {
	const from = 'I3SYP4ZHMDUSFUL2BXTVIBZ6I3BOWOKAKP3RDDTZMXXJLBK6XKSJZ7SB5Y';
	const to = 'HZ57J3K46JIJXILONBBZOHX6BKPXEM2VVXNRFSUED6DKFD5ZD24PMJ3MVA';

	const action = useCallback(async () => {
		try {
			await AlgoSigner.connect();
			const accts = await AlgoSigner.accounts({
				ledger: 'TestNet',
			});
			const txParams = await AlgoSigner.algod({
				ledger: 'TestNet',
				path: `/v2/transactions/params`,
			});
			const signedTx = await AlgoSigner.sign({
				from: accts[0]['address'],
				to: to,
				amount: 10000,
				note: 'An Optional',
				type: 'pay',
				fee: txParams['min-fee'],
				firstRound: txParams['last-round'],
				lastRound: txParams['last-round'] + 1000,
				genesisID: txParams['genesis-id'],
				genesisHash: txParams['genesis-hash'],
				flatFee: true,
			});
			const r = await AlgoSigner.send({
				ledger: 'TestNet',
				tx: signedTx.blob,
			});
			//const tx = await waitForAlgoSignerConfirmation(r['tx']);

			return JSON.stringify(r, null, 2);
		} catch (e) {
			console.error(e);
			return JSON.stringify(e, null, 2);
		}
	}, []);

	return (
		<ExampleAlgoSigner
			title='Send with AlgoSigner'
			buttonText='Send'
			buttonAction={action}
		/>
	);
};

async function waitForAlgoSignerConfirmation(tx) {
	console.log(`Transaction ${tx.txId} waiting for confirmation....`);
	let status = await AlgoSigner.algod({
		ledger: 'TestNet',
		path: '/v2/transactions/pending/' + tx.txId,
	});

	while (true) {
		if (status['confirmed-round'] !== null && status['confirmed-round'] > 0) {
			console.log(
				`Transaction confirmed in round ${status['confirmed-round']}.`
			);
			break;
		}
		status = await AlgoSigner.algod({
			ledger: 'TestNet',
			path: '/v2/transactions/pending/' + tx.txId,
		});
	}
	return tx;
}
const GetParams = () => {
	const action = useCallback(async () => {
		try {
			const r = await AlgoSigner.algod({
				ledger: 'TestNet',
				path: `/v2/transactions/params`,
			});
			return JSON.stringify(r, null, 2);
		} catch (e) {
			console.error(e);
			return JSON.stringify(e, null, 2);
		}
	}, []);

	return (
		<ExampleAlgoSigner
			title='Get Transaction params'
			buttonText='Get Params'
			buttonAction={action}
		/>
	);
};

const GetStatus = () => {
	const action = useCallback(async () => {
		try {
			const r = await AlgoSigner.algod({
				ledger: 'TestNet',
				path: '/v2/status',
			});
			return JSON.stringify(r, null, 2);
		} catch (e) {
			console.error(e);
			return JSON.stringify(e, null, 2);
		}
	}, []);

	return (
		<ExampleAlgoSigner
			title='Get TestNet Algod Status'
			buttonText='Get Status'
			buttonAction={action}
		/>
	);
};

const GetAppGlobalState = () => {
	const action = useCallback(async () => {
		try {
			const r = await AlgoSigner.indexer({
				ledger: 'TestNet',
				path: `/v2/applications/${appId}`,
			});
			return JSON.stringify(
				r['application']['params']['global-state'][0]['value'][`uint`],
				null,
				2
			);
		} catch (e) {
			console.error(e);
			return JSON.stringify(e, null, 2);
		}
	}, []);

	return (
		<ExampleAlgoSigner
			title='Get Global State'
			buttonText='Get Global'
			buttonAction={action}
		/>
	);
};
const GetAppLocalState = ({ who }) => {
	const action = useCallback(async () => {
		try {
			const accts = await AlgoSigner.accounts({
				ledger: 'TestNet',
			});
			const r = await AlgoSigner.indexer({
				ledger: 'TestNet',
				path: `/v2/accounts/${accts[who]['address']}`,
			});
			return JSON.stringify(
				r['account']['apps-local-state'][0]['key-value'][0]['value'][`uint`],
				null,
				2
			);
		} catch (e) {
			console.error(e);
			return JSON.stringify(e, null, 2);
		}
	}, [who]);

	return (
		<ExampleAlgoSigner
			title='Get Local State'
			buttonText='Get Local'
			buttonAction={action}
		/>
	);
};
const OptInApp = ({ who }) => {
	const action = useCallback(async () => {
		await AlgoSigner.connect({
			ledger: 'TestNet',
		});
		const accts = await AlgoSigner.accounts({
			ledger: 'TestNet',
		});
		const txParams = await AlgoSigner.algod({
			ledger: 'TestNet',
			path: `/v2/transactions/params`,
		});
		const signedTx = await AlgoSigner.sign({
			from: accts[who]['address'],
			type: 'appl',
			appIndex: appId,
			appOnComplete: 1,
			fee: txParams['min-fee'],
			firstRound: txParams['last-round'],
			lastRound: txParams['last-round'] + 1000,
			genesisID: txParams['genesis-id'],
			genesisHash: txParams['genesis-hash'],
			flatFee: true,
		});
		const r = await AlgoSigner.send({
			ledger: 'TestNet',
			tx: signedTx.blob,
		});

		return JSON.stringify(r, null, 2);
	}, [who]);

	return (
		<ExampleAlgoSigner
			title='Opt In App'
			buttonText='OptIn'
			buttonAction={action}
		/>
	);
};
const CallApp = ({ who }) => {
	const action = useCallback(async () => {
		await AlgoSigner.connect({
			ledger: 'TestNet',
		});
		const accts = await AlgoSigner.accounts({
			ledger: 'TestNet',
		});
		const txParams = await AlgoSigner.algod({
			ledger: 'TestNet',
			path: '/v2/transactions/params',
		});
		const signedTx = await AlgoSigner.sign({
			from: accts[who]['address'],
			type: 'appl',
			appIndex: appId,
			appOnComplete: 0,
			appArgs: [''],
			fee: txParams['min-fee'],
			firstRound: txParams['last-round'],
			lastRound: txParams['last-round'] + 1000,
			genesisID: txParams['genesis-id'],
			genesisHash: txParams['genesis-hash'],
			flatFee: true,
		});
		const r = await AlgoSigner.send({
			ledger: 'TestNet',
			tx: signedTx.blob,
		});

		return JSON.stringify(r, null, 2);
	}, [who]);

	return (
		<ExampleAlgoSigner
			title='Call App'
			buttonText='CallApp'
			buttonAction={action}
		/>
	);
};

const TableLocalAppState = () => {
	return (
		<table>
			<thead>
				<tr>
					<td>Alice</td>
					<td>Bob</td>
				</tr>
			</thead>
			<tbody>
				<tr>
					<td>
						<GetAppLocalState who={0} />
					</td>
					<td>
						<GetAppLocalState who={1} />
					</td>
				</tr>
				<tr>
					<td>
						<OptInApp who={0} />
					</td>
					<td></td>
				</tr>
				<tr>
					<td>
						<CallApp who={0} />
					</td>
					<td>
						<CallApp who={1} />
					</td>
				</tr>
			</tbody>
		</table>
	);
};

const NoWarningSign = () => {
	const from = 'I3SYP4ZHMDUSFUL2BXTVIBZ6I3BOWOKAKP3RDDTZMXXJLBK6XKSJZ7SB5Y';
	const to = 'GO7DNCP7E22OZB22ZIYMUKWQEOSJJ3VELJXUKG2BYHWSTO7P6PTKVPDVBQ';

	const action = useCallback(async () => {
		try {
			const suggestedParams = await apiGetTxnParams('testnet');
			console.log(suggestedParams);
			const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
				from: from,
				to: to,
				amount: 100000,
				note: new Uint8Array(Buffer.from('example note value')),
				suggestedParams,
			});
			const binaryTx = txn.toByte();
			const base64Tx = AlgoSigner.encoding.msgpackToBase64(binaryTx);
			const signedTxs = await AlgoSigner.signTxn([
				{
					txn: base64Tx,
				},
			]);
			console.log(signedTxs);
			const r = await AlgoSigner.send({
				ledger: 'TestNet',
				tx: signedTxs[0].blob,
			});

			return JSON.stringify(r, null, 2);
		} catch (e) {
			console.error(e);
			return JSON.stringify(e, null, 2);
		}
	}, []);

	return (
		<ExampleAlgoSigner
			title='Send with LogicCall'
			buttonText='Logic'
			buttonAction={action}
		/>
	);
};

const LogicCall = () => {
	const from = 'I3SYP4ZHMDUSFUL2BXTVIBZ6I3BOWOKAKP3RDDTZMXXJLBK6XKSJZ7SB5Y';
	const to = 'GO7DNCP7E22OZB22ZIYMUKWQEOSJJ3VELJXUKG2BYHWSTO7P6PTKVPDVBQ';

	const action = useCallback(async () => {
		try {
			const suggestedParams = await apiGetTxnParams('testnet');
			console.log(suggestedParams);
			const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
				from: from,
				to: to,
				amount: 100000,
				note: new Uint8Array(Buffer.from('example note value')),
				suggestedParams,
			});
			const binaryTx = txn.toByte();
			const base64Tx = AlgoSigner.encoding.msgpackToBase64(binaryTx);
			const signedTxs = await AlgoSigner.signTxn([
				{
					txn: base64Tx,
				},
			]);
			console.log(signedTxs);
			const r = await AlgoSigner.send({
				ledger: 'TestNet',
				tx: signedTxs[0].blob,
			});

			return JSON.stringify(r, null, 2);
		} catch (e) {
			console.error(e);
			return JSON.stringify(e, null, 2);
		}
	}, []);

	return (
		<ExampleAlgoSigner
			title='Send with LogicCall'
			buttonText='Logic'
			buttonAction={action}
		/>
	);
};

export default function ExampleSigner() {
	return (
		<>
			<CheckAlgoSigner />
			<LogicCall />
			<ConnectAlgoSigner />
			<GetParams />

			<header>Application {appId}</header>
			<GetAppGlobalState />
			<TableLocalAppState />
		</>
	);
}
