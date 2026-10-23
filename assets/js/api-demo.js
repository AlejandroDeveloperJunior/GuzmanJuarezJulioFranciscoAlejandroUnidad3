// Cliente de prueba del web service propio (consume api/equipos.php con fetch)
(function () {
    const $ = (id) => document.getElementById(id);
    const salida = $('salida');
    let ultimoCreado = null;

    const ejemploEquipo = {
        nombre: 'Mexico City Aztecas',
        abreviatura: 'MEX',
        ciudad: 'Ciudad de México',
        conferencia: 'NFC',
        division: 'Sur',
        estadio: 'Estadio Banorte',
        fundacion: 2026,
        latitud: 19.302900,
        longitud: -99.150500,
        color: '#006847'
    };

    const ejemplos = {
        listar:   { metodo: 'GET', ruta: 'api/equipos.php', cuerpo: '' },
        uno:      { metodo: 'GET', ruta: 'api/equipos.php?id=14', cuerpo: '' },
        crear:    { metodo: 'POST', ruta: 'api/equipos.php', cuerpo: JSON.stringify(ejemploEquipo, null, 2) },
        editar:   () => ({ metodo: 'PUT', ruta: 'api/equipos.php?id=' + (ultimoCreado || 1),
                           cuerpo: JSON.stringify({ estadio: 'Estadio Ciudad de México', color: '#0B3D2E' }, null, 2) }),
        eliminar: () => ({ metodo: 'DELETE', ruta: 'api/equipos.php?id=' + (ultimoCreado || 1), cuerpo: '' }),
        sinToken: { metodo: 'POST', ruta: 'api/equipos.php', cuerpo: JSON.stringify(ejemploEquipo, null, 2), sinToken: true }
    };

    document.querySelectorAll('[data-ejemplo]').forEach((b) => {
        b.addEventListener('click', () => {
            let ej = ejemplos[b.dataset.ejemplo];
            if (typeof ej === 'function') ej = ej();
            $('metodo').value = ej.metodo;
            $('ruta').value = ej.ruta;
            $('cuerpo').value = ej.cuerpo;
            if (ej.sinToken) $('token').value = '';
        });
    });

    $('enviar').addEventListener('click', async () => {
        const metodo = $('metodo').value;
        const opciones = { method: metodo, headers: {} };
        const token = $('token').value.trim();
        if (token) opciones.headers['Authorization'] = 'Bearer ' + token;
        if (['POST', 'PUT'].includes(metodo)) {
            opciones.headers['Content-Type'] = 'application/json';
            opciones.body = $('cuerpo').value;
        }

        salida.textContent = 'Enviando ' + metodo + ' ' + $('ruta').value + ' …';
        const inicio = performance.now();
        try {
            const resp = await fetch($('ruta').value, opciones);
            const ms = Math.round(performance.now() - inicio);
            const texto = await resp.text();
            let bonito = texto;
            try {
                const json = JSON.parse(texto);
                bonito = JSON.stringify(json, null, 2);
                if (metodo === 'POST' && resp.status === 201) ultimoCreado = json.data.id;
            } catch (e) { /* respuesta no JSON */ }
            salida.innerHTML = '';
            const estado = document.createElement('div');
            estado.className = 'estado';
            estado.textContent = `${metodo} ${$('ruta').value}\nHTTP ${resp.status} ${resp.statusText} · ${ms} ms\n`;
            salida.appendChild(estado);
            salida.appendChild(document.createTextNode(bonito));
        } catch (err) {
            salida.textContent = 'Error de red: ' + err.message;
        }
    });
})();
