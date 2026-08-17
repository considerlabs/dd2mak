<?php
if ( ! defined( 'ABSPATH' ) ) exit;
?>
</main>

<footer class="site-footer">
	<div class="site-footer__inner">
		<nav aria-label="푸터 메뉴">
			<?php
			wp_nav_menu( array(
				'theme_location' => 'footer',
				'container'      => false,
				'menu_class'     => 'footer-menu',
				'fallback_cb'    => false,
			) );
			?>
		</nav>
		<p class="site-footer__copy">&copy; <?php echo esc_html( date( 'Y' ) ); ?> <?php bloginfo( 'name' ); ?>. All rights reserved.</p>
	</div>
</footer>

<?php wp_footer(); ?>
</body>
</html>
