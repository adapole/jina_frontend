import * as React from 'react';
import Image from 'next/image';
import ASAIcon from './ASAIcon';
import algo from '../public/algo.svg';
import { formatBigNumWithDecimals } from '../pages/helpers/utilities';
import { IAssetData } from '../pages/helpers/types';
import { CheckCircleIcon } from '@heroicons/react/solid';
import algosdk from 'algosdk';
import {
	AssetTransactionType,
	Scenario,
	ScenarioReturnType,
} from '../pages/scenarios';
import { apiGetTxnParams, ChainType } from '../pages/helpers/api';

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
const testAccounts = [
	//algosdk.mnemonicToSecretKey(
	//	'cannon scatter chest item way pulp seminar diesel width tooth enforce fire rug mushroom tube sustain glide apple radar chronic ask plastic brown ability badge'
	//),
	algosdk.mnemonicToSecretKey(
		'excuse help topic once acoustic decline stock insane convince dove debate main bullet violin guess anchor salt account spin unaware grain modify install absent account'
	),
	//process.env.TESTACCOUNT_MENMONIC
];
const singleAssetTransferTxn: Scenario = async (
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
const scenarios1: Array<{ name: string; scenario1: Scenario }> = [
	{
		name: 'Dispense',
		scenario1: singleAssetTransferTxn,
	},
];

function signTxnScenario(scenario1: Scenario): void {
	throw new Error('Function not implemented.');
}

const Dispencer = (props: { assets: IAssetData[] }) => {
	const { assets } = props;
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
		<>
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
										onClick={() => signTxnScenario(scenario1)}
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
										onClick={() => signTxnScenario(scenario1)}
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
		</>
	);
};

export default Dispencer;
