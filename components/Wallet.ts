import WalletConnect from '@walletconnect/client';
import QRCodeModal from 'algorand-walletconnect-qrcode-modal';
import algosdk from 'algosdk';
import { formatJsonRpcRequest } from '@json-rpc-tools/utils';

async function App() {
	// Create a connector
	const connector = new WalletConnect({
		bridge: 'https://bridge.walletconnect.org', // Required
		qrcodeModal: QRCodeModal,
	});

	//await this.setState({ connector });

	// Check if connection is already established
	if (!connector.connected) {
		// create new session

		//await connector.createSession();
		connector.createSession();
	}

	// subscribe to events
	//await this.subscribeToEvents();
	//public subscribeToEvents = () => {
	//    const { connector } = this.state;
	//
	//  if (!connector) {
	//     return;
	//  }

	// Subscribe to connection events
	connector.on('connect', (error, payload) => {
		if (error) {
			throw error;
		}

		// Get provided accounts
		const { accounts } = payload.params[0];
		// this.onConnect(payload);
	});

	connector.on('session_update', (error, payload) => {
		if (error) {
			throw error;
		}

		// Get updated accounts
		const { accounts } = payload.params[0];
		// this.onSessionUpdate(accounts);
	});

	connector.on('disconnect', (error, payload) => {
		if (error) {
			throw error;
		}
		// this.onDisconnect();
	});

	const SuggestedParams = {
		/**
		 * Integer fee per byte, in microAlgos. For a flat fee, set flatFee to true
		 */
		fee: 1000,
		/**
		 * First protocol round on which this txn is valid
		 */
		firstRound: 6000000,
		/**
		 * Last protocol round on which this txn is valid
		 */
		lastRound: 600200,
		/**
		 * Specifies genesis ID of network in use
		 */
		genesisID: 'genesisstring',
		/**
		 * Specifies hash genesis block of network in use
		 */
		genesisHash: 'hashofgenesis',
	};
	// Draft transaction
	const txn = algosdk.makePaymentTxnWithSuggestedParamsFromObject({
		from: 'ALICEU3WMO5XYJVSODKJSYLFILIXXBEXHKIVSMX7GMGXJAYGFCJKVSQTUE',
		to: 'HZ57J3K46JIJXILONBBZOHX6BKPXEM2VVXNRFSUED6DKFD5ZD24PMJ3MVA',
		amount: 100000,
		suggestedParams: SuggestedParams,
	});

	// Sign transaction
	// txns is an array of algosdk.Transaction like below
	// i.e txns = [txn, ...someotherTxns], but we've only built one transaction in our case
	const txns = [txn];
	const txnsToSign = txns.map((txn) => {
		const encodedTxn = Buffer.from(
			algosdk.encodeUnsignedTransaction(txn)
		).toString('base64');

		return {
			txn: encodedTxn,
			message: 'Description of transaction being signed',
			// Note: if the transaction does not need to be signed (because it's part of an atomic group
			// that will be signed by another party), specify an empty singers array like so:
			// signers: [],
		};
	});

	const requestParams = [txnsToSign];

	const request = formatJsonRpcRequest('algo_signTxn', requestParams);
	const result: Array<string | null> = await this.connector.sendCustomRequest(
		request
	);
	const decodedResult = result.map((element) => {
		return element ? new Uint8Array(Buffer.from(element, 'base64')) : null;
	});

	// Delete connector
	connector.killSession();
}

export default App;
