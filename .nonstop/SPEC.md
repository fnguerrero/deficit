# SPEC — ciclo 6: Fito humano y el sistema que engancha

## Objetivo

Dos cosas que van juntas. Primero, **el personaje pasa a ser una persona** cuyo cuerpo
refleja el cuerpo real de Nico: su IMC medido y sus entrenamientos, no su conducta del día.
Segundo, **el andamiaje que hace que se vuelva**: rachas por actividad, XP, niveles, logros,
sonidos y un personaje que reclama con voz propia.

El ciclo 5 dejó la app cumplible. Este la vuelve difícil de abandonar.

## Alcance

**Entra:**

1. **Personaje humano** (sigue llamándose Fito) en SVG paramétrico, con tres ejes:
   contextura por IMC, musculatura por entrenamiento, y cara/postura por el día.
2. **Rachas por actividad** separadas: agua, entrenamiento, registro y sueño.
3. **Protección de racha** que se gana con uso.
4. **XP, niveles y logros.**
5. **Sonidos** sintetizados con WebAudio, con interruptor.
6. **Voz propia del personaje**: reclama, insiste, festeja. Cargoso y divertido.
7. Pantalla donde se ven rachas, nivel y logros.

**No entra:**

- **Push real con servidor.** Los avisos de hoy son `setTimeout` + `Notification`: solo
  suenan con la app abierta. Perseguir a Nico con el celular en el bolsillo necesita un
  push service y un backend que despierte, y eso es un proyecto propio. Lo que sí se
  exprime es todo lo que se puede hacer sin eso: que reclame al abrir, que insista adentro.
- **Ligas y competencia.** Duolingo las usa porque tiene millones de usuarios; acá hay uno.
  Una liga de una persona es un espejo, no un incentivo.
- **Vidas o corazones.** Castigar quitando acceso a la app hace que se registre menos, que
  es exactamente lo contrario de lo que sirve acá.
- Medir la estimación de platos servidos: sigue necesitando las fotos de Nico.

## Stack y decisiones

Sin cambios: HTML/CSS/JS vanilla, sin build ni dependencias, una pantalla por archivo.
El personaje se dibuja en SVG generado en JS, y los sonidos se sintetizan con WebAudio —
ni una imagen ni un `.mp3` que descargar.

## Supuestos

1. **El cuerpo sale del dato medido, nunca de la conducta del día.** Comer de más pone la
   cara de culpa; engorda al personaje solo si la balanza dice que engordaste. Es la
   decisión de diseño central del ciclo: sin esa separación el muñeco se vuelve un reproche
   diario y deja de ser creíble.
2. **El IMC solo miente en quien entrena**, porque el músculo pesa. Por eso la musculatura
   corrige a la contextura: mismo IMC, entrenando, se ve macizo; sin entrenar, blando. Y
   cuando hay entrenamiento sostenido la app lo dice en texto, en vez de dejar que el número
   solo acuse falsamente.
3. **La contextura es continua, no cuatro dibujos.** Se interpola entre extremos con el IMC
   clampeado a 17–35, para que un kilo se note un poco y no haya saltos bruscos al cruzar
   un umbral.
4. **Rango realista y digno**: el personaje con IMC alto es una persona corpulenta, no una
   caricatura. Sin panzas de dibujito ni deformaciones. Es el cuerpo de Nico.
5. **Sin dato de peso no se inventa contextura**: se dibuja la media y se pide el peso.
6. **El XP se gana por registrar, no por cumplir.** Cumplir da más, pero un día malo
   registrado también suma: lo que sostiene el hábito es volver, no no fallar nunca. Es el
   mismo principio del nivel del ciclo 5, que ahora pasa a medirse en XP.
7. **La protección de racha se gana, no se compra ni se regala.** Una cada 7 días
   registrados, hasta 2 guardadas. Se gasta sola cuando se pierde un día.
8. **Las rachas por actividad son independientes**: perder la de agua no toca la de
   entrenamiento. Cuatro rachas chicas se recuperan; una sola grande, cuando se rompe,
   se abandona.
9. **El sonido arranca apagado** hasta que Nico lo prenda, y respeta `prefers-reduced-motion`
   como señal de que no quiere estímulos. Un sonido inesperado en el colectivo se apaga
   para siempre.
10. **El juego no se sincroniza como tabla propia.** XP, nivel, rachas y logros
    se derivan de los días, que ya se sincronizan: otro dispositivo los
    reconstruye solo, sin migración de base. Lo único que queda por dispositivo
    son los escudos gastados y qué logros ya se festejaron, y el precio de eso
    es que en el peor caso un escudo se gaste dos veces. Una tabla nueva para
    dos campos, con el SQL que Nico tendría que correr a mano, no lo vale.
11. **La voz reclama pero no humilla.** Insistente, dramática y con humor; nunca desprecio
    ni culpa por el cuerpo. La diferencia entre que dé gracia volver y que dé bronca abrir.

## Criterios de aceptación

1. La suite entera pasa, con tests nuevos por cada ítem con lógica.
2. Sin errores de consola, en escritorio y en móvil.
3. Un estado del ciclo 5 migra sin perder nada y estrena los campos nuevos.
4. El personaje es reconociblemente humano y se lee bien a 96 px.
5. Dos pesos muy distintos, misma altura, dibujan cuerpos visiblemente distintos —
   verificado sobre las medidas que genera el SVG, no a ojo.
6. Con entrenamiento sostenido el mismo IMC dibuja un cuerpo más macizo, y la app aclara
   por texto que el IMC subestima a quien entrena.
7. Comer de más NO cambia el cuerpo: cambia la cara. Verificado comparando dos días con el
   mismo peso y distinta comida.
8. Los ocho ánimos siguen siendo distinguibles entre sí en el personaje nuevo.
9. Las cuatro rachas suben y se cortan por separado.
10. La protección de racha se gana cada 7 días, tapa un día perdido y se consume.
11. El XP sube al completar objetivos, el nivel sube con el XP, y los logros se desbloquean.
12. Los sonidos suenan con el interruptor prendido y no suenan apagado, sin errores si el
    navegador bloquea el audio.
13. El personaje dice cosas distintas según el día, y ninguna repite dos veces seguidas.
14. La pantalla Hoy sigue entrando sin scroll en 375×812.
15. Ningún archivo pasa su límite de líneas.

## Presupuesto

55 iteraciones.
