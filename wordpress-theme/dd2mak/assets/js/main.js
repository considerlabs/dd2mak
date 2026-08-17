(function () {
	'use strict';

	var toggle = document.querySelector( '.nav-toggle' );
	var menu = document.getElementById( 'primary-menu' );

	if ( toggle && menu ) {
		toggle.addEventListener( 'click', function () {
			var isOpen = menu.classList.toggle( 'is-open' );
			toggle.setAttribute( 'aria-expanded', isOpen ? 'true' : 'false' );
		} );
	}
} )();
