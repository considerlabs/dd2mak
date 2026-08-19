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

	if ( ! menu ) {
		return;
	}

	// 모바일: 하위 있는 상위 메뉴 탭 시 펼침 (링크 이동은 두 번째 탭/전체보기용으로 유지)
	menu.querySelectorAll( '.menu-item-has-children' ).forEach( function ( item ) {
		var link = item.querySelector( ':scope > a' );
		var sub = item.querySelector( ':scope > .sub-menu' );
		if ( ! link || ! sub ) {
			return;
		}

		link.addEventListener( 'click', function ( event ) {
			if ( window.matchMedia( '(max-width: 640px)' ).matches ) {
				if ( ! item.classList.contains( 'is-open' ) ) {
					event.preventDefault();
					menu.querySelectorAll( '.menu-item-has-children.is-open' ).forEach( function ( openItem ) {
						if ( openItem !== item ) {
							openItem.classList.remove( 'is-open' );
						}
					} );
					item.classList.add( 'is-open' );
				}
			}
		} );
	} );
} )();
