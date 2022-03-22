import * as React from 'react';
import Image from 'next/image';
import ASAIcon from './ASAIcon';
import algo from '../public/algo.svg';
import { formatBigNumWithDecimals } from '../pages/helpers/utilities';
import { IAssetData } from '../pages/helpers/types';
import { apiGetAccountAssets, ChainType } from '../pages/helpers/api';

const BalanceAsset = (props: { asset: IAssetData; Bodyamount: string }) => {
	const { asset, Bodyamount } = props;
	const nativeCurrencyIcon = asset.id === 0 ? algo : null;
	const USDCIcon = asset.id === 10458941;
	const JinaIcon = asset.id === 79077841;
	const LOFTYIcon = asset.id === 77141623;
	const [items, setItems] = React.useState('');
	//const amountChange = asset.amount;

	React.useEffect(() => {
		console.log('Asset: ' + asset.amount);
	}, []);
	return (
		<div
			className='flex w-full max-w-2xl items-center p-5 justify-evenly sm:max-w-4xl lg:max-w-5xl'
			{...props}
		>
			<div className='flex items-center space-x-1'>
				{/* Algo Icon */}
				{nativeCurrencyIcon && (
					<Image
						className='h-10 rounded-full cursor-pointer transition duration-150 transform hover:scale-110'
						src='/algo.svg'
						alt='algo'
						width='40'
						height='40'
					/>
				)}
				{/* USDC 31566704 icon and Jina icon */}
				{USDCIcon && <ASAIcon assetID={31566704} />}
				{JinaIcon && <ASAIcon assetID={asset.id} />}
				{LOFTYIcon && <ASAIcon assetID={asset.id} />}

				<div className='flex ml-2'>{asset.name}</div>
			</div>
			<div className='flex'>
				{Bodyamount && (
					<>
						<div className='flex' key={items}>
							{`${Bodyamount} ${asset.unitName || 'units'}`}
						</div>
					</>
				)}
				{!Bodyamount && (
					<div className='flex' key={items}>
						{`${formatBigNumWithDecimals(asset.amount, asset.decimals)} ${
							asset.unitName || 'units'
						}`}
					</div>
				)}
			</div>
		</div>
	);
};

export default BalanceAsset;
