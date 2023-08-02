# Laboratorio Virtual de Microbiología

## Experiencia RV

Usamos la librería `webpack` tanto para desarrollo interno como para correr el servidor que procesa y genera los archivos con los resultados finales

De todas formas que es posible correr la aplicación con archivos HTML y JS estáticos, sin necesidad de un servidor. El único costo es que no se van a poder generar los archivos finales para los estudiantes, pero el resto corre perfectamente normal.

Para correr webpack (con el servidor), ejecutar lo siguiente:

```
npm install
npm run dev
```

La aplicación se puede correr [https://localhost:8080]() (nótese el protocolo HTTPS). También se puede acceder desde una IP de red local (192.168.X.X). La dirección se imprime en pantalla al correr `npm run dev`

Para solamente generar los archivos estáticos se puede ejecutar lo siguiente:

```
npm run build
```

Los resultados se encuentran dentro del directorio `dist`.

## Info para devs

### Cómo crear un testbench

Webpack está configurado (por nosotros) para agregar cualquier testbench que se cree. Para agregar uno nuevo:

1. Crear una carpeta nueva dentro de `testbenches` (e.g. `test-nuevo`)
2. Agregar dentro de esta carpeta un archivo `index.html` y uno `main.js`
3. Correr `npm run dev` (si ya estaba corriendo hace falta terminar el proceso y volver a correr), e ir a [https://localhost:8080/test-nuevo.html]()
