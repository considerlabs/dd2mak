<?php
if ( ! defined( 'ABSPATH' ) ) exit;

get_header();

get_template_part( 'template-parts/home/hero' );
get_template_part( 'template-parts/home/topics' );
get_template_part( 'template-parts/home/popular' );
get_template_part( 'template-parts/home/finder' );
get_template_part( 'template-parts/home/jobs' );
get_template_part( 'template-parts/home/health' );
get_template_part( 'template-parts/home/digital' );
get_template_part( 'template-parts/home/contact' );

get_footer();
