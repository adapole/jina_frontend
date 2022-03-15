import HeaderOption from './HeaderOption';
import React from 'react';

function HeaderOptions() {
	return (
		<div className='flex space-x-6'>
			<HeaderOption title='All' selected />
			<HeaderOption title='Earn' />
			<HeaderOption title='Claim' />

			{/* <div>{isTabOne && <p>This is tab one content</p>}</div>
			<div>{isTabTwo && <p>TAB 2</p>}</div>
			<div>{isTabThree && <p>3 TAB 33</p>}</div> */}
		</div>
	);
}

export default HeaderOptions;
