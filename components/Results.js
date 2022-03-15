import FlipMove from 'react-flip-move';
function Results() {
	return (
		<FlipMove className='px-5 my-10 sm:grid md:grid-cols-2 xl:grid-cols-3 3xl:flex flex-wrap justify-center'>
			<div className='flex w-full mt-5 hover:shadow-lg focus-within:shadow-lg max-w-md rounded-full border border-gray-200 px-5 py-3 items-center sm:max-w-xl lg:max-w-2xl'>
				<p className='h-5 mr-3 text-gray-800'>( max )</p>
				<input
					type='text'
					className='flex-grow focus:outline-none bg-[#FAFAFA]'
				/>
			</div>
			<div className='flex flex-col w-1/2 space-y-2 justify-center mt-8 sm:space-y-0 sm:flex-row sm:space-x-4'>
				<button className='btn'>Borrow</button>
				<button className='btn'>Increase Collateral</button>
			</div>
		</FlipMove>
	);
}

export default Results;
