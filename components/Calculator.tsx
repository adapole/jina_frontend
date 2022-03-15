import React from 'react';
import { formatBigNumWithDecimals } from '../pages/helpers/utilities';
import { IAssetData } from '../pages/helpers/types';
import {} from '../pages/app';

export default function Calculator(props: { asset: IAssetData }) {
	const { asset } = props;
	const nativeCurrencyIcon = asset.id === 0;
	const USDCIcon = asset.id === 10458941;
	const JinaIcon = asset.id === 71360698;

	return (
		<div
			className='flex w-full max-w-2xl items-center p-5 justify-evenly sm:max-w-4xl lg:max-w-5xl'
			{...props}
		>
			<div className='flex'>
				<div className='flex'>
					{`${formatBigNumWithDecimals(asset.amount, asset.decimals)} ${
						asset.unitName || 'units'
					}`}
				</div>
			</div>
		</div>
	);
}
