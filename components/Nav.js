import React from 'react';
import HeaderOptions from './HeaderOptions';
import Results from './Results';

function Nav() {
	const [openTab, setOpenTab] = React.useState(1);

	return (
		<>
			<nav className='relative border-b'>
				<div className='flex px-10 sm:px-20 text-2xl whitespace-nowrap space-x-10 sm:space-x-20  '>
					<a
						className={`last:pr-24 border-b-2 border-transparent pb-1 cursor-pointer transition duration-100 transform hover:scale-105 hover:text-indigo-500 hover:border-indigo-500 ${
							openTab === 1 && 'text-indigo-500 border-indigo-500'
						}`}
						onClick={(e) => {
							e.preventDefault();
							setOpenTab(1);
						}}
						data-toggle='tab'
						href='#link1'
						role='tablist'
					>
						Borrow
					</a>
					<a
						className={`last:pr-24 border-b-2 border-transparent pb-1 cursor-pointer transition duration-100 transform hover:scale-105 hover:text-indigo-500 hover:border-indigo-500 ${
							openTab === 2 && 'text-indigo-500 border-indigo-500'
						}`}
						onClick={(e) => {
							e.preventDefault();
							setOpenTab(2);
						}}
						data-toggle='tab'
						href='#link2'
						role='tablist'
					>
						Earn
					</a>
					<a
						className={` border-b-2 border-transparent pb-1 cursor-pointer transition duration-100 transform hover:scale-105 hover:text-indigo-500 hover:border-indigo-500 ${
							openTab === 3 && 'text-indigo-500 border-indigo-500'
						}`}
						onClick={(e) => {
							e.preventDefault();
							setOpenTab(3);
						}}
						data-toggle='tab'
						href='#link3'
						role='tablist'
					>
						Claim
					</a>
				</div>
				{/* <div className='absolute top-0 right-0 bg-gradient-to-l from-[#06202A] h-10 w-1/12' /> */}
			</nav>

			{/* <HeaderOptions /> */}

			{/* <div className={openTab === 1 ? 'block' : 'hidden'} id='link1'>
				<p className='ml-0 bg-yellow-300'>Algo amount</p>
				<p> Avalible balance</p>
			</div>

			<div className={openTab === 2 ? 'block' : 'hidden'} id='link2'>
				<p className='bg-pink-300'>USDC amount Avalible balance</p>
			</div>
			<div className={openTab === 3 ? 'block' : 'hidden'} id='link3'>
				<p className='bg-blue-300'>Claim USDC Repay Debt</p>
			</div> */}
		</>
	);
}

export default Nav;
