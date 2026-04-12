import { c as createComponent } from './astro-component_D5_XVChv.mjs';
import 'piccolore';
import { h as addAttribute, o as renderHead, p as renderSlot, r as renderTemplate, m as maybeRenderHead } from './entrypoint_tiITStdf.mjs';
import 'clsx';

const $$Layout = createComponent(($$result, $$props, $$slots) => {
  const Astro2 = $$result.createAstro($$props, $$slots);
  Astro2.self = $$Layout;
  const {
    title = "SubliFlow — De 3 horas a 5 minutos en producción de uniformes",
    description = "Automatiza la generación de archivos de impresión para equipos deportivos. Define las reglas una vez, aplícalas a todos los jugadores automáticamente."
  } = Astro2.props;
  return renderTemplate`<html lang="es"> <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><meta name="description"${addAttribute(description, "content")}><link rel="icon" type="image/svg+xml" href="/favicon.svg"><link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin><link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap" rel="stylesheet"><title>${title}</title>${renderHead()}</head> <body> ${renderSlot($$result, $$slots["default"])} </body></html>`;
}, "C:/Users/lieds/Documents/GitHub/pluginIlustrator/landing/src/layouts/Layout.astro", void 0);

const $$Navbar = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<header class="nb-header" data-astro-cid-5blmo7yk> <div class="nb-header-inner" data-astro-cid-5blmo7yk> <a href="/" class="nb-logo" data-astro-cid-5blmo7yk> <div class="nb-logo-mark" data-astro-cid-5blmo7yk>SF</div> <span class="nb-logo-text" data-astro-cid-5blmo7yk>SubliFlow</span> </a> <nav class="nb-nav" data-astro-cid-5blmo7yk> <a href="#proceso" data-astro-cid-5blmo7yk>Cómo funciona</a> <a href="#features" data-astro-cid-5blmo7yk>Features</a> <a href="#pricing" data-astro-cid-5blmo7yk>Precios</a> </nav> <a href="#waitlist" class="btn btn-yellow btn-sm" data-astro-cid-5blmo7yk>
Acceso anticipado →
</a> </div> </header>`;
}, "C:/Users/lieds/Documents/GitHub/pluginIlustrator/landing/src/components/Navbar.astro", void 0);

const $$Footer = createComponent(($$result, $$props, $$slots) => {
  return renderTemplate`${maybeRenderHead()}<footer class="footer" data-astro-cid-sz7xmlte> <!-- Top: brand + nav columns --> <div class="footer-main" data-astro-cid-sz7xmlte> <div class="footer-brand" data-astro-cid-sz7xmlte> <a href="/" class="footer-logo" data-astro-cid-sz7xmlte> <div class="footer-logo-mark" data-astro-cid-sz7xmlte>SF</div> <span data-astro-cid-sz7xmlte>SubliFlow</span> </a> <p class="footer-tagline" data-astro-cid-sz7xmlte>
Automatiza la producción de uniformes deportivos.<br data-astro-cid-sz7xmlte>
De horas a minutos.
</p> <div class="footer-social" data-astro-cid-sz7xmlte> <a href="mailto:hola@subliflow.com" class="social-link" data-astro-cid-sz7xmlte>hola@subliflow.com</a> </div> </div> <div class="footer-nav-cols" data-astro-cid-sz7xmlte> <div class="footer-col" data-astro-cid-sz7xmlte> <span class="footer-col-title" data-astro-cid-sz7xmlte>Producto</span> <a href="#proceso" data-astro-cid-sz7xmlte>Cómo funciona</a> <a href="#features" data-astro-cid-sz7xmlte>Features</a> <a href="#pricing" data-astro-cid-sz7xmlte>Precios</a> <a href="#waitlist" data-astro-cid-sz7xmlte>Acceso anticipado</a> </div> <div class="footer-col" data-astro-cid-sz7xmlte> <span class="footer-col-title" data-astro-cid-sz7xmlte>Legal</span> <a href="/terminos" data-astro-cid-sz7xmlte>Términos de uso</a> <a href="/privacidad" data-astro-cid-sz7xmlte>Privacidad</a> </div> <div class="footer-col" data-astro-cid-sz7xmlte> <span class="footer-col-title" data-astro-cid-sz7xmlte>Contacto</span> <a href="mailto:hola@subliflow.com" data-astro-cid-sz7xmlte>hola@subliflow.com</a> <a href="#" data-astro-cid-sz7xmlte>Sublimania Studio</a> </div> </div> </div> <!-- Bottom bar --> <div class="footer-bottom" data-astro-cid-sz7xmlte> <span class="footer-copy" data-astro-cid-sz7xmlte>© 2026 SubliFlow. Todos los derechos reservados.</span> <span class="footer-made" data-astro-cid-sz7xmlte>Hecho con ❤ en Argentina</span> <a href="#" class="footer-top-link" data-astro-cid-sz7xmlte>↑ Volver arriba</a> </div> </footer>`;
}, "C:/Users/lieds/Documents/GitHub/pluginIlustrator/landing/src/components/Footer.astro", void 0);

export { $$Layout as $, $$Navbar as a, $$Footer as b };
