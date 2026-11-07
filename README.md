# World Knowledge

Portale personale in stile **Dark Premium**, con il feed verticale tipo Reels come schermata principale e sezioni separate per notizie, argomenti, apprendimento e contenuti salvati.

## Cosa include

- Feed verticale con scorrimento e snap, ottimizzato per smartphone e desktop.
- Anteprime RSS con titolo, descrizione, fonte, data e collegamento alla pubblicazione originale.
- Aggregazione RSS lato server, così il browser non dipende da proxy CORS.
- Cache server con aggiornamento automatico ogni 8 minuti (configurabile).
- Sezioni: Per te, Ultime notizie, Esplora argomenti, Impara ogni giorno, Salvati, I miei interessi.
- PWA installabile e cache di base per riaprire l'interfaccia anche con connessione temporaneamente assente.
- Preferenze e salvati memorizzati localmente nel browser.
- Supporto ai video RSS diretti compatibili (MP4/WebM): autoplay silenzioso quando la scheda entra nel feed, pausa quando esce e controlli manuali.
- Lettura vocale di titoli e descrizioni tramite sintesi vocale integrata nel browser, con scelta della voce disponibile in base all’argomento.
- Pulsanti di ascolto nelle schede e nell’approfondimento.

## Requisiti

- Node.js 20 o superiore.
- Connessione Internet per recuperare gli RSS.

## Avvio sul computer

1. Estrai la cartella del progetto.
2. Apri un terminale nella cartella `world-knowledge`.
3. Esegui:

   ```bash
   npm install
   npm start
   ```

4. Apri `http://localhost:3000`.

Per lo sviluppo con riavvio automatico:

```bash
npm run dev
```

## Aggiornamenti

Il server interroga le fonti all'avvio e, successivamente, ogni 8 minuti. Il primo utente che visita il feed dopo la scadenza della cache può attivare un aggiornamento; le fonti che non rispondono vengono segnalate e riprovate al ciclo successivo.

Gli RSS non sono un servizio di breaking news garantito: la frequenza dipende dal singolo editore. Il sito conserva l'ultimo feed riuscito se una fonte temporaneamente non risponde.

## Pubblicazione online

Il progetto include `Dockerfile` e `render.yaml` come configurazione di partenza per un servizio Node. Per renderlo sempre raggiungibile occorre:

1. creare un servizio su un provider di hosting Node/Docker;
2. collegare questo progetto (per esempio tramite un repository Git);
3. pubblicare il servizio e, facoltativamente, collegare un dominio personale;
4. verificare `/api/health` e installare la PWA dal browser.

La pubblicazione non è stata eseguita: richiede accesso a un account di hosting e, se si desidera, al dominio dell'utente.

## Audio e video

I video vengono riprodotti automaticamente solo se la fonte RSS fornisce un URL video diretto compatibile; partono sempre silenziati e si fermano quando la scheda esce dall’area visibile. La riproduzione dipende dal supporto del browser e dalla disponibilità del file della fonte. I video incorporati da piattaforme esterne e i documentari lunghi non vengono ancora ricercati automaticamente: richiedono una successiva integrazione con fonti/cataloghi autorizzati.

La funzione “Ascolta” usa la sintesi vocale del dispositivo/browser. Le voci e la loro varietà dipendono da quelle installate: l’app sceglie una voce disponibile in base alla categoria, ma non genera ancora voci professionali personalizzate.

## PWA

Il manifest e il service worker sono già inclusi. Dopo la pubblicazione su HTTPS, i browser compatibili potranno offrire l'installazione sulla schermata Home. Il service worker mette in cache l'interfaccia e l'ultima risposta API disponibile.

Le notifiche push non sono ancora abilitate: richiedono un servizio push e chiavi VAPID configurate sul server.

## Dati personali e sincronizzazione

In questa prima release preferenze e salvati vengono conservati in `localStorage`, quindi restano sul singolo browser/dispositivo. La sincronizzazione tra smartphone e computer richiede un account personale e un database online, che non vengono simulati in questa build.

## Fonti RSS configurate

- BBC News: mondo, tecnologia, economia, scienza e ambiente.
- The Guardian: mondo, tecnologia, scienza, business.
- NASA: feed generale.
- Nature: feed della rivista.

I feed vengono mostrati come anteprime attribuite, con link all'articolo originale. Non viene ripubblicato il testo integrale degli articoli.

**Nota su ANSA:** non è stato aggiunto il feed ANSA. Le condizioni pubblicate da ANSA consentono l'uso RSS per lettura personale/non commerciale, ma vietano la pubblicazione dei titoli su siti web o weblog senza autorizzazione specifica. Potrà essere integrato solo dopo aver ottenuto il permesso appropriato.

## API

- `GET /api/health` — stato server e fonti.
- `GET /api/sources` — elenco fonti configurate.
- `GET /api/feed?category=all&limit=60` — contenuti aggregati.
