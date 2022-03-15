import { ChainType } from '../pages/helpers/api';
import { ellipseAddress } from '../pages/helpers/utilities';
import Avatar from './Avatar';
import * as PropTypes from 'prop-types';
import * as React from 'react';

interface IHeaderStyle {
	connected: boolean;
}

interface IHeaderProps {
	killsession: () => unknown;
	connected: boolean;
	address: string;
	chain: ChainType;
	chainupdate: (newChain: ChainType) => unknown;
}

function stringToChainType(s: string): ChainType {
	switch (s) {
		case ChainType.MainNet.toString():
			return ChainType.MainNet;
		case ChainType.TestNet.toString():
			return ChainType.TestNet;
		default:
			throw new Error(`Unknown chain selected: ${s}`);
	}
}

const Header = (props: IHeaderProps) => {
	const { connected, address, killsession } = props;
	return (
		<div
			className='flex w-full justify-between text-sm text-gray-500'
			{...props}
		>
			{connected && (
				<div className='p-5'>
					<p>
						{`Connected to `}
						<select
							onChange={(event) =>
								props.chainupdate(stringToChainType(event.target.value))
							}
							value={props.chain}
						>
							<option value={ChainType.TestNet}>Algorand TestNet</option>
							<option value={ChainType.MainNet}>Algorand MainNet</option>
						</select>
					</p>
				</div>
			)}
			{address && (
				<div className='flex space-x-4 items-center'>
					<div className='flex flex-row text-gray-500'>
						{ellipseAddress(address).slice(0, 9)}
					</div>
					<div className='relative group pr-0.5'>
						<div className='absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-md blur opacity-60 group-hover:opacity-10 transition duration-600 group-hover:duration-200'></div>
						<button
							className='relative px-7 py-2 rounded-md leading-none flex items-center bg-[#d6d6da] group-hover:bg-[#2CB7BC]'
							onClick={killsession}
						>
							<span className='text-indigo-400 group-hover:text-gray-100 transition duration-200'>
								Disconnect
							</span>
						</button>
					</div>
					<span className='items-center space-x-5 pr-1 hidden sm:inline-flex'>
						<Avatar
							url={`https://avatars.dicebear.com/api/adventurer/${ellipseAddress(
								address
							).slice(0, 6)}.svg`}
						/>
					</span>
				</div>
			)}
		</div>
	);
};

Header.propTypes = {
	killsession: PropTypes.func.isRequired,
	address: PropTypes.string,
};

export default Header;
