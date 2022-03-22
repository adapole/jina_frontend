import { useState, useCallback } from 'react';
import algosdk from 'algosdk';
import {
	ChainType,
	apiGetTxnParams,
	tealProgramMake,
} from '../pages/helpers/api';
import Modal from './Modal';
import Loader from './Loader';

export default function AlgoSignerLsig() {
	const [result, setResult] = useState([]);
	const [resultFound, setResultFound] = useState(false);

	const [showModal, setShowModal] = useState(false);
	const [isError, setIsError] = useState(false);
	const [pendingRequest, setPendingRequest] = useState(false);

	const LogicsigMaker = useCallback(async () => {
		const from = 'I3SYP4ZHMDUSFUL2BXTVIBZ6I3BOWOKAKP3RDDTZMXXJLBK6XKSJZ7SB5Y';
		const to = 'GO7DNCP7E22OZB22ZIYMUKWQEOSJJ3VELJXUKG2BYHWSTO7P6PTKVPDVBQ';
		try {
			const suggestedParams = await apiGetTxnParams(ChainType.TestNet);
			//console.log(suggestedParams);
			const lsig = await tealProgramMake(10000000);

			const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
				from: from,
				to: to,
				amount: 100000,
				note: new Uint8Array(Buffer.from('Test')),
				suggestedParams,
			});
			const binaryTx = txn.toByte();
			//const binaryTxLsig = lsig.toByte()
			toggleModal();
			setIsError(false);
			await AlgoSigner.connect({
				ledger: 'TestNet',
			});
			setPendingRequest(true);

			const base64Tx = AlgoSigner.encoding.msgpackToBase64(binaryTx);
			const signedTxs = await AlgoSigner.signTxn([
				{
					txn: base64Tx,
				},
			]);
			console.log(signedTxs);
			setPendingRequest(false);

			const r = await AlgoSigner.send({
				ledger: 'TestNet',
				tx: signedTxs[0].blob,
			});
			//console.log(r);

			//return JSON.stringify(r, null, 2);
			return r;
		} catch (e) {
			console.error(e);
			setPendingRequest(false);
			setIsError(true);
			//return JSON.stringify(e, null, 2);
			return e;
		}
	}, []);

	const signing = useCallback(async () => {
		const rarray = { txId: 'Rejected!' };
		const r = await LogicsigMaker();
		if (r.message) {
			rarray = [r.message];
			//console.log(rarray);
			setResult(rarray);
			setResultFound(true);
		} else if (r.txId) {
			rarray = [r.txId];
			setResult(rarray);
			setResultFound(true);
		}
	}, [LogicsigMaker]);

	const toggleModal = () => {
		setShowModal(!showModal);
	};

	return (
		<>
			<button
				onClick={(e) => {
					e.preventDefault();
					signing();
				}}
				className='btn'
			>
				LogicStake
			</button>
			<Modal show={showModal} toggleModal={toggleModal}>
				{pendingRequest ? (
					<div className='w-full break-words'>
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
				) : resultFound ? (
					<div className='w-full break-words'>
						{isError && (
							<div className='mt-1 mb-0 font-bold text-xl'>
								{'Call RequestError UserRejected'}
							</div>
						)}
						{!isError && (
							<div className='mt-1 mb-0 font-bold text-xl'>
								{'Call Request Approved'}
							</div>
						)}
						<div className='w-full flex mt-1 mb-0'>
							{isError && <div className='w-1/6 font-bold'>{`Error: `}</div>}
							{!isError && <div className='w-1/6 font-bold'>{`TxID: `}</div>}
							<div className='w-10/12 font-mono'>
								<div>{!!result && <p>{result}</p>}</div>
							</div>
						</div>
					</div>
				) : (
					<div className='w-full break-words'>
						<div className='mt-1 mb-0 font-bold text-xl'>
							{'Connect to AlgoSigner Wallet'}
						</div>
					</div>
				)}
			</Modal>
		</>
	);
}
