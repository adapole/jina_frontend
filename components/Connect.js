import React from 'react';
import Avatar from '../components/Avatar';

function Connect() {
	let isAuthenticated = false;
	const authError = false;
	const [showAlert, setShowAlert] = React.useState(true);
	if (!isAuthenticated)
		return (
			<>
				{/* Error message while connecting, && authError */}
				{showAlert && authError && (
					<div
						class='relative py-3 pl-4 pr-10 leading-normal text-red-700 bg-red-100 rounded-lg z-50'
						role='alert'
					>
						<span class='absolute inset-y-0 right-0 flex items-center mr-4'>
							<svg
								class='w-4 h-4 fill-current'
								role='button'
								viewBox='0 0 20 20'
								onClick={() => setShowAlert(false)}
							>
								<path
									d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
									clip-rule='evenodd'
									fill-rule='evenodd'
								></path>
							</svg>
						</span>

						<p class='font-bold'>Authentication failed</p>
						{/* <p>{authError.message}</p> */}
					</div>
				)}
				{/* Connect button */}
				<div
					className='flex space-x-4 items-center'
					onClick={() => (authError = true)}
				>
					<div className='relative group' onClick={() => setShowAlert(true)}>
						<div className='absolute -inset-0.5 bg-gradient-to-r from-pink-600 to-purple-600 rounded-md blur opacity-75 group-hover:opacity-100 transition duration-600 group-hover:duration-200 animate-tilt'></div>
						<button
							onClick={() => isAuthenticated == true}
							className='relative px-7 py-2 rounded-md leading-none flex items-center divide-x divide-gray-600 bg-black'
						>
							<span className='pr-2 text-gray-100'>Connect wallet</span>
							{/* <span className='pl-2 text-indigo-400 group-hover:text-gray-100 transition duration-200'>
								Connect wallet
							</span> */}
						</button>
					</div>
				</div>
			</>
		);
	var str = JSON.stringify('G07DPNC32');
	var result = str.substring(1, 6);

	return (
		<div className='flex space-x-4 items-center'>
			{/*   opacity: ${({ connected }) => (connected ? 1 : 0)};
  visibility: ${({ connected }) => (connected ? "visible" : "hidden")};
  pointer-events: ${({ connected }) => (connected ? "auto" : "none")};, divide-x divide-gray-500 ,Once wallet is connected create avatar,  https://avatars.dicebear.com/api/pixel-art/:seed.svg */}
			<span className='flex flex-row text-gray-500 '>{result + '...'}</span>
			<div className='relative group'>
				<div className='absolute -inset-0.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-md blur opacity-60 group-hover:opacity-10 transition duration-600 group-hover:duration-200'></div>
				<button className='relative px-7 py-2 rounded-md leading-none flex items-center bg-[#d6d6da] group-hover:bg-[#2CB7BC]'>
					<span className='text-indigo-400 group-hover:text-gray-100 transition duration-200'>
						Disconnect
					</span>
				</button>
			</div>
			<span className='flex items-center space-x-5'>
				<Avatar
					url={`https://avatars.dicebear.com/api/adventurer/${result}.svg`}
				/>
			</span>
		</div>
	);
}

export default Connect;
