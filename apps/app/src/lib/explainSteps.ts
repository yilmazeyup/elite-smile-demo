import type { ExplainerId } from '@smile/shared';

/**
 * The words of the six 3D explainers: one short, calm paragraph per step. General information, written to match what
 * the model shows; the dentist explains what applies to you.
 */

export type Step = { title: string; text: string; chip: string };

export const STEPS: Record<ExplainerId, Step[]> = {
  implantaat: [
    { chip: 'De plek', title: 'Waar een tand ontbreekt', text: 'Het tandvlees is genezen en er is genoeg bot. Was dat er niet, dan is het eerst opgebouwd, zoals bij Layla.' },
    { chip: 'Opening', title: 'Verdoving en een kleine opening', text: 'Je krijgt een plaatselijke verdoving. De tandarts maakt een kleine opening in het tandvlees, zodat het bot zichtbaar is.' },
    { chip: 'Ruimte', title: 'Ruimte in het bot', text: 'Met boortjes die steeds iets breder worden, gekoeld met water, ontstaat precies de ruimte voor het implantaat. Je voelt druk, geen pijn.' },
    { chip: 'Implantaat', title: 'Het implantaat gaat erin', text: 'De titanium schroef wordt rustig in het bot gedraaid tot hij stevig vastzit. Hij neemt de plaats in van de wortel.' },
    { chip: 'Genezen', title: 'Genezen en vastgroeien', text: 'Een healing cap houdt de plek open terwijl het tandvlees geneest. In 3 tot 6 maanden groeit het bot vast aan de schroef.' },
    { chip: 'Opbouw', title: 'De opbouw', text: 'Zit het implantaat vast, dan gaat de healing cap eraf en komt er een opbouw op, vastgezet met een klein schroefje.' },
    { chip: 'Kroon', title: 'De kroon', text: 'Een kroon op maat, in de kleur van je tanden, maakt het af. Je kauwt en poetst ermee als met een eigen kies.' },
    { chip: 'Onderdelen', title: 'Alle onderdelen', text: 'Kroon, schroefje, opbouw en implantaat. Daarom is een implantaatpaspoort handig: een volgende tandarts weet dan precies welk systeem je hebt.' },
  ],
  wortelkanaal: [
    { chip: 'Ontsteking', title: 'Een ontstoken zenuw', text: 'Binnen in je tand zit de pulpa: zenuw en bloedvaatjes. Door een diep gaatje of een barst kan die ontsteken, soms tot bij de wortelpunt.' },
    { chip: 'Verdoven', title: 'Verdoven en droog houden', text: 'Je wordt verdoofd. Een rubberen lapje om de tand, een cofferdam, houdt hem droog en schoon tijdens de behandeling.' },
    { chip: 'Opening', title: 'Een opening in de kroon', text: 'Via een kleine opening bovenin de tand komt de tandarts bij de pulpakamer en de ingangen van de kanalen.' },
    { chip: 'Reinigen', title: 'De kanalen reinigen', text: 'Met dunne vijltjes wordt het ontstoken weefsel verwijderd en elk kanaal tot de wortelpunt vormgegeven en gespoeld.' },
    { chip: 'Vullen', title: 'De kanalen vullen', text: 'De schone kanalen worden helemaal gevuld en afgesloten, zodat er geen bacteriën meer in kunnen.' },
    { chip: 'Afsluiten', title: 'Afsluiten', text: 'Een tijdelijke of definitieve vulling sluit de opening. Bij een kies beschermt daarna vaak een kroon de tand.' },
    { chip: 'Kroon', title: 'Een kroon als bescherming', text: 'Een behandelde tand is brozer. Een kroon eromheen voorkomt dat hij breekt. Je eigen tand blijft staan.' },
  ],
  kroon: [
    { chip: 'Zwakke tand', title: 'Een zwakke tand', text: 'Een grote vulling, een barst of een wortelkanaalbehandeling kan een tand verzwakken. Een kroon omsluit hem en geeft kracht terug.' },
    { chip: 'Slijpen', title: 'Verdoven en vormgeven', text: 'Na de verdoving wordt de tand rondom iets kleiner geslepen, zodat de kroon er straks precies overheen past.' },
    { chip: 'Scan', title: 'Een digitale afdruk', text: 'Een scanner maakt een 3D-afdruk van de tand en de buren. Daarmee wordt de kroon op maat gemaakt, in de kleur van je tanden.' },
    { chip: 'Tijdelijk', title: 'Een tijdelijke kroon', text: 'Tot de kroon klaar is, beschermt een tijdelijke kroon de geslepen tand. Wees er voorzichtig mee bij plakkerig eten.' },
    { chip: 'Kroon', title: 'De kroon past', text: 'De tijdelijke kroon gaat eraf. De tandarts past de nieuwe kroon en kijkt of de rand en de beet goed zijn.' },
    { chip: 'Vast', title: 'Vastgezet', text: 'De kroon wordt vastgezet met cement. Poets en flos er gewoon omheen, net als bij je eigen tanden.' },
  ],
  facing: [
    { chip: 'Voortand', title: 'Kleur of vorm verbeteren', text: 'Een verkleurde, beschadigde of ongelijke voortand kan een nieuwe voorkant krijgen: een facing, een dun schilfertje porselein of composiet.' },
    { chip: 'Voorbereiden', title: 'Een heel dun laagje', text: 'Vaak wordt een heel dun laagje glazuur aan de voorkant weggehaald, ongeveer een halve millimeter. Dat is niet terug te draaien.' },
    { chip: 'Afdruk', title: 'Afdruk of scan', text: 'Een scan of afdruk legt de vorm vast. Samen kies je de kleur, zodat de facing past bij je andere tanden.' },
    { chip: 'Facing', title: 'De facing', text: 'De facing wordt gepast. Pas als jij en de tandarts tevreden zijn over vorm en kleur, wordt hij vastgezet.' },
    { chip: 'Uitharden', title: 'Vastzetten met licht', text: 'De facing wordt met een speciale lijm op de tand gezet. Blauw licht laat de lijm in een paar seconden uitharden.' },
    { chip: 'Klaar', title: 'Klaar', text: 'Een gladde, glanzende voorkant. Met goed poetsen en controles gaat een facing vaak vele jaren mee.' },
  ],
  vulling: [
    { chip: 'Gaatje', title: 'Een gaatje', text: 'Bacteriën in tandplak maken zuren die het glazuur oplossen. Zo ontstaat een gaatje, dat zonder behandeling verder naar binnen gaat.' },
    { chip: 'Verdoven', title: 'Rustig beginnen', text: 'Meestal krijg je eerst een verdoving, zodat je niets voelt. Je kunt altijd een teken geven als je even wilt stoppen.' },
    { chip: 'Schoonmaken', title: 'Het zachte deel eruit', text: 'Het aangetaste, zachte deel wordt weggehaald. Wat overblijft is gezond en stevig.' },
    { chip: 'Hechtlaag', title: 'Voorbehandelen', text: 'De tand wordt voorbehandeld met een gel en een hechtlaag, zodat de vulling er goed aan vastzit.' },
    { chip: 'Vullen', title: 'Laag voor laag', text: 'Witte vulling in de kleur van je tand gaat er laag voor laag in. Blauw licht hardt elke laag uit.' },
    { chip: 'Polijsten', title: 'Glad en op hoogte', text: 'De vulling wordt glad gepolijst. Je bijt even op een gekleurd papiertje, zodat de tandarts kan zien of je beet klopt.' },
  ],
  beugel: [
    { chip: 'Scheef', title: 'Scheve tanden', text: 'Tanden die gedraaid of over elkaar staan zijn lastiger schoon te houden. Een beugel zet ze stap voor stap recht.' },
    { chip: 'Slotjes', title: 'De slotjes', text: 'Op elke tand wordt een klein slotje (bracket) geplakt. Dat doet geen pijn; er wordt niet geboord.' },
    { chip: 'Draad', title: 'De draad', text: 'Een draad door de slotjes, vastgezet met elastiekjes. De draad wil terug naar zijn mooie boog en neemt de tanden mee.' },
    { chip: 'Bewegen', title: 'Langzaam bewegen', text: 'Elke zes tot acht weken stelt de orthodontist bij. Na een controle kunnen je tanden een paar dagen gevoelig zijn.' },
    { chip: 'Recht', title: 'Recht', text: 'Na maanden tot een paar jaar staan je tanden recht. De slotjes worden eraf gehaald en je tanden gepolijst.' },
    { chip: 'Retainer', title: 'Zo houden', text: 'Een dun draadje achter je tanden of een doorzichtige beugel voor de nacht houdt ze op hun plek. Zonder retainer schuiven tanden terug.' },
  ],
};
