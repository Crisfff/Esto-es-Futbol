# Esto es-Futbol

Interfaz web responsive para organizar y reproducir canales deportivos desde fuentes autorizadas.

## Diseño

- Blanco, gris y negro.
- Responsive para móvil, tablet y escritorio.
- Iconos de librería mediante Lucide.
- Tarjetas de canales con botón **Reproducir**.
- Buscador y filtros.
- Reproductor integrado con soporte HLS mediante hls.js.

## Archivos

- `index.html` — estructura principal.
- `styles.css` — diseño completo.
- `app.js` — canales, filtros y reproductor.

## Añadir una señal

En `app.js`, cada canal contiene:

```js
{
  id: "espn-deportes",
  name: "ESPN Deportes",
  group: "ESPN",
  detail: "Fútbol y deportes en español",
  streamUrl: ""
}
```

Coloca en `streamUrl` una URL de vídeo o HLS (`.m3u8`) que tengas autorización para distribuir o reproducir.

Ejemplo:

```js
streamUrl: "https://tu-servidor.example/canal/playlist.m3u8"
```

Si `streamUrl` está vacío, la interfaz muestra **Fuente pendiente**.

## Canales incluidos en la base visual

- ESPN Deportes
- ESPN 1
- ESPN 2
- ESPN Premium
- FOX Sports
- FOX Sports 2
- TUDN
- DAZN
