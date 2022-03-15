import Image from 'next/image';
import { createAvatar } from '@dicebear/avatars';
import * as style from '@dicebear/adventurer';

let svg = createAvatar(style, {
	seed: 'custom-seed',
	// ... and other options
});

function Avatar({ url }) {
	return (
		<>
			<img
				loading='lazy'
				className='h-10 bg-indigo-500 shadow-lg shadow-indigo-500/50 rounded-full cursor-pointer transition duration-150 transform hover:scale-110'
				src={url}
				alt='profile pic'
			/>
			{/* <p>{createAvatar(style, `{ seed: 'custom-seed' }`)}</p> */}
		</>
	);
}

export default Avatar;
