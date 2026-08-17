(function () {
	'use strict';

	var content = document.querySelector( '.entry-content' );
	var tocBox = document.getElementById( 'dd2mak-toc' );

	if ( ! content || ! tocBox ) {
		return;
	}

	var headings = content.querySelectorAll( 'h2, h3' );
	var list = tocBox.querySelector( 'ol' );

	if ( ! headings.length || ! list ) {
		return;
	}

	headings.forEach( function ( heading, index ) {
		if ( ! heading.id ) {
			heading.id = 'toc-' + ( index + 1 );
		}

		var item = document.createElement( 'li' );
		var link = document.createElement( 'a' );
		link.href = '#' + heading.id;
		link.textContent = heading.textContent;
		item.appendChild( link );
		list.appendChild( item );
	} );

	tocBox.classList.add( 'has-items' );
} )();
