import * as React from 'react';
import Image from 'next/image';
import ASAIcon from './ASAIcon';
import algo from '../public/algo.svg';
import { formatBigNumWithDecimals } from '../pages/helpers/utilities';
import { IAssetData } from '../pages/helpers/types';

const AssetRow = (props: { asset: IAssetData }) => {
	const { asset } = props;
	const nativeCurrencyIcon = asset.id === 0 ? algo : null;

	return (
		<div className='flex p-5 justify-between w-full' {...props}>
			<div className='flex'>
				{nativeCurrencyIcon ? (
					<Image
						className='h-10 rounded-full cursor-pointer transition duration-150 transform hover:scale-110'
						src='/algo.svg'
						alt='algo'
						width='40'
						height='40'
					/>
				) : (
					<ASAIcon assetID={asset.id} />
				)}

				<div className='flex ml-2'>{asset.name}</div>
			</div>
			<div className='flex'>
				<div className='flex'>
					{`${formatBigNumWithDecimals(asset.amount, asset.decimals)} ${
						asset.unitName || 'units'
					}`}
				</div>
			</div>
		</div>
	);
};

export default AssetRow;
