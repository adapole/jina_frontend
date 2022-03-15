import * as React from 'react';
import Image from 'next/image';
import ASAIcon from './ASAIcon';
import { formatBigNumWithDecimals } from '../pages/helpers/utilities';
import algosdk from 'algosdk';
import {
	apiGetAccountAssets,
	apiSubmitTransactions,
	ChainType,
	apiGetTxnParams,
} from '../pages/helpers/api';
import {
	IAssetData,
	IWalletTransaction,
	SignTxnParams,
} from '../pages/helpers/types';

interface IScenarioTxn {
	txn: algosdk.Transaction;
	signers?: string[];
	authAddr?: string;
	message?: string;
}

type ScenarioReturnType = IScenarioTxn[][];

type Scenario = (
	chain: ChainType,
	address: string,
	amount: BigInt
) => Promise<ScenarioReturnType>;

const TransactionAsset = (props: { asset: IAssetData }) => {
	const { asset } = props;
	const nativeCurrencyIcon = asset.id === 0;
	const USDCIcon = asset.id === 10458941;
	const JinaIcon = asset.id === 23324881;

	return <></>;
};

const singlePayTxn: Scenario = async (
	chain: ChainType,
	address: string
): Promise<ScenarioReturnType> => {
	const suggestedParams = await apiGetTxnParams(chain);
	// Draft transaction
	const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
		from: address,
		to: 'HZ57J3K46JIJXILONBBZOHX6BKPXEM2VVXNRFSUED6DKFD5ZD24PMJ3MVA',
		amount: 100000,
		note: new Uint8Array(Buffer.from('example note value')),
		suggestedParams,
	});

	// Sign transaction
	// txns is an array of algosdk.Transaction like below
	// i.e txns = [txn, ...someotherTxns], but we've only built one transaction in our case
	const txnsToSign = [
		{
			txn,
			message: 'This is a transaction message',
			// Note: if the transaction does not need to be signed (because it's part of an atomic group
			// that will be signed by another party), specify an empty singers array like so:
			// signers: [],
		},
	];
	return [txnsToSign];
};

export default TransactionAsset;
