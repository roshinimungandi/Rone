import { inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  catchError,
  map,
  Observable,
  of,
  tap,
} from 'rxjs';

import { HomeContent, NewsSection, NewsStory, VideoItem } from '../models/news.model';
import { ArticleService } from './article.service';

@Injectable({
  providedIn: 'root'
})
export class NewsContentService {

  // -- HttpClient (injected for live API calls) ------------------------------
  private readonly http = inject(HttpClient);
  private readonly platformId = inject(PLATFORM_ID);
  private readonly articleService = inject(ArticleService);

  // -- Live API state signals ------------------------------------------------
  /**
   * true  = NewsAPI proxy is reachable and returned data
   * false = offline / API key not set; static fallback is active
   */
  readonly isLive = signal(false);

  /** Current loading state of the live feed. */
  readonly loadingState = signal<'idle' | 'loading' | 'error' | 'ready'>('idle');
  private readonly content: HomeContent = {
    leadStory: {
      id: 'lead-001',
      category: 'Global Affairs',
      title: 'Leaders push for a rapid trade corridor agreement as shipping costs climb',
      summary:
        'Delegates from 14 countries are debating new safeguards for energy and food routes after freight insurance rates spiked this week.',
      timestamp: '12 minutes ago',
      readTime: '4 min read',
      imageUrl:
        'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?auto=format&fit=crop&w=1280&q=80',
      author: 'Jonathan Mercer',
      location: 'BRUSSELS',
      relatedIds: ['headline-001', 'world-001'],
      body: [
        'BRUSSELS, April 20 (Reuters) — Delegates from 14 nations convened in Brussels on Sunday for an emergency round of talks aimed at fast-tracking a multilateral trade corridor agreement, as surging freight insurance premiums threatened to choke global supply chains for the second time in three years.',
        'The sessions, chaired by the European Union\'s Trade Commissioner and attended by representatives from the United States, China, India, Brazil, and nine other major trading nations, come after a week in which freight insurance rates rose a further 18 percent — pushing the cumulative increase since January to nearly 40 percent.',
        '"We cannot afford another six-month standoff," said one senior EU diplomat, speaking on condition of anonymity because negotiations are ongoing. "The insurance market is pricing in a risk level that is making certain routes commercially unviable."',
        'The proposed corridor framework would establish harmonised documentation standards, shared real-time visibility into vessel movements, and a pooled insurance backstop for participating nations. Analysts say the backstop element — which would require each government to contribute to a multilateral fund — remains the most contentious item.',
        'Shipping industry groups have urged negotiators to move quickly. The International Chamber of Shipping said in a statement released Sunday that delays in reaching an agreement were already forcing carriers to make re-routing decisions that would add weeks to delivery times for agricultural commodities, industrial components, and pharmaceutical inputs.',
        'Energy minister representatives have separately signalled support for a parallel annex covering liquefied natural gas and crude oil shipments, arguing that the energy provisions need to be separated from the broader trade text to allow faster implementation.',
        'A senior official from one of the participating delegations said a framework document could be signed within 72 hours if the insurance backstop question is resolved, though others cautioned that the fiscal commitments involved made that timeline optimistic.',
        'Markets responded cautiously. The Baltic Dry Index, a benchmark for shipping costs, edged 0.4 percent lower in early trading on Monday, reflecting investor hope that progress is being made but scepticism about the pace of implementation.',
      ],
    },
    spotlightStory: {
      id: 'spotlight-001',
      category: 'Technology',
      title: 'Chip suppliers shift roadmaps as demand for edge AI accelerates',
      summary:
        'Contract manufacturers are rebalancing production away from consumer devices toward industrial automation and healthcare imaging.',
      timestamp: '1 hour ago',
      readTime: '6 min read',
      imageUrl:
        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1280&q=80',
      author: 'Priya Anand',
      location: 'TAIPEI',
      relatedIds: ['tech-001', 'tech-002'],
      body: [
        'TAIPEI, April 20 (Reuters) — Several of the world\'s largest semiconductor contract manufacturers are revising their product roadmaps to prioritise chips designed for edge artificial intelligence workloads, as demand from consumer electronics softens and orders from industrial and healthcare customers surge.',
        'Three people familiar with the planning said major foundries are reallocating capacity on mature process nodes — typically 28 nanometres and above — to serve customers building AI inference chips for factory automation, medical imaging equipment, and smart infrastructure.',
        '"The story of the last two years was data centre AI. The story of the next three years is edge AI," said one semiconductor analyst at a Taipei-based investment firm. "And the chips for edge AI look very different — lower power, real-time processing, purpose-built for specific tasks."',
        'Demand from consumer electronics, which had driven growth at the mature nodes for much of the past decade, has declined. Global smartphone shipments fell for the second consecutive year in 2025, and smart home device sales have plateaued in most developed markets.',
        'In contrast, industrial automation customers are placing orders for chips in applications ranging from robotic vision systems in automotive assembly plants to predictive maintenance sensors in chemical facilities. Healthcare imaging device makers are similarly expanding orders as hospitals invest in AI-assisted diagnostics.',
        'The shift has implications for the broader supply chain. Packaging and testing companies are also adapting, with several announcing investments in specialised capabilities for the kinds of heterogeneous chip architectures that edge AI applications require.',
        'One major contract manufacturer declined to comment on specific customer plans but confirmed in a written statement that its mix of revenue was "evolving in line with end-market demand trends, with industrial and medtech segments growing as a proportion of total revenue."',
        'Analysts at two major brokerages have raised their forecasts for mature-node utilisation rates in the second half of this year, citing the edge AI tailwind. However, they cautioned that the transition would not fully offset the drag from weaker consumer demand until 2027.',
        'Capital expenditure plans also reflect the strategic shift. Several chipmakers have said they would increase spending on specialised testing equipment while moderating investments in the advanced lithography tools primarily needed for next-generation consumer chips.',
      ],
    },
    topHeadlines: [
      {
        id: 'headline-001',
        category: 'Policy',
        title: 'Central banks signal caution as inflation data diverges across major economies',
        summary: 'Officials indicated that rate cuts remain data-dependent heading into summer.',
        timestamp: '33 minutes ago',
        readTime: '3 min read',
        imageUrl:
          'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=640&q=80',
        author: 'Sophie Laurent',
        location: 'WASHINGTON',
        relatedIds: ['markets-002', 'headline-002'],
        body: [
          'WASHINGTON, April 20 (Reuters) — Senior officials at three of the world\'s major central banks delivered strikingly similar messages over the weekend: interest rate reductions are possible later this year, but only if inflation data provides greater clarity than current readings allow.',
          'The remarks, delivered in separate appearances at an International Monetary Fund conference in Washington, underscored how diverging price trends across advanced economies have complicated the task of coordinating monetary policy normalisation.',
          'In the United States, core personal consumption expenditure inflation — the Federal Reserve\'s preferred measure — ticked up to 2.8 percent in March, above consensus expectations and the Fed\'s 2 percent target. Fed Governor Elena Castillo told reporters the data "argues for patience" and that the committee would need to see "at least two or three months of moderating prints" before reconsidering the stance on rates.',
          'In Europe, the picture is different. Euro area headline inflation fell to 2.1 percent in March, its lowest level in more than two years, while core inflation — which strips out energy and food — dropped to 2.6 percent. European Central Bank Chief Economist Marco Rennert said the disinflationary trend was "on track" but that the ECB would wait for the June projections before making any decisions.',
          'The Bank of Japan offered its own note of caution. With wage growth running at its highest level in three decades, Governor Yuki Tanaka said he saw grounds for further tightening later in the year, but that the pace would be "very gradual" given global uncertainty.',
          'Currency markets reacted to the divergence. The dollar strengthened slightly against the euro and yen after the Fed governor\'s comments, though traders said the move was modest and reflected positioning rather than conviction about the rate outlook.',
          'Bond markets were similarly subdued. U.S. 10-year Treasury yields rose two basis points to 4.41 percent, while German Bund yields held steady. Swaps markets pushed back slightly the implied timing of the first Fed cut, to September from August.',
        ],
      },
      {
        id: 'headline-002',
        category: 'Energy',
        title: 'Refinery outages raise diesel futures while cargo rerouting eases crude pressure',
        summary: 'Traders expect volatility to remain elevated through next month.',
        timestamp: '52 minutes ago',
        readTime: '5 min read',
        imageUrl:
          'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=640&q=80',
        author: 'Marcus Osei',
        location: 'LONDON',
        relatedIds: ['markets-003', 'lead-001'],
        body: [
          'LONDON, April 20 (Reuters) — Diesel futures climbed to their highest level in six weeks on Monday as a series of unplanned refinery outages in the U.S. Gulf Coast and northern Europe tightened distillate supplies, even as rerouted crude cargoes pressured the front end of the oil curve.',
          'ICE gasoil futures rose 1.4 percent to $687 per tonne in early trading, extending gains from last week spurred by a maintenance shutdown at a major Texas refinery and a separate, unrelated outage at a facility in the Netherlands.',
          'The back-to-back stoppages have reduced European diesel import options at a seasonally sensitive time, traders said. Demand for diesel typically picks up in late spring as agricultural activity increases across the continent and construction activity accelerates.',
          '"We have a situation where supply at the refinery gate is getting squeezed at exactly the moment seasonal demand is peaking," said one energy trader at a major commodity house in London. "The spread between refined products and crude is going to stay elevated for weeks."',
          'Crude oil told a different story. Brent futures slipped 0.6 percent to $87.42 per barrel after data showed that several major cargoes originally bound for European refineries had been rerouted to Asia following last month\'s disruption to northern European logistics routes.',
          'The additional arriving cargoes relieved some of the tightness in Asian crude markets, traders said, leading to a modest narrowing of the Brent-Dubai spread, a key gauge of relative supply across the two markets.',
          'Analysts at two major investment banks maintained their second-quarter Brent forecasts in the range of $85–$92 per barrel, citing a volatile but range-bound outlook given the competing pressures of refinery tightness and rerouting flows.',
          'Volatility measures for crude options have climbed to their highest since February. Traders said the combination of geopolitical uncertainty, logistical disruption, and inventory data releases scheduled for later this week was likely to keep conditions choppy.',
        ],
      },
      {
        id: 'headline-003',
        category: 'Business',
        title: 'Retail groups test smaller urban formats to offset slower suburban traffic',
        summary: 'Analysts expect lease restructuring to become a bigger theme this quarter.',
        timestamp: '2 hours ago',
        readTime: '4 min read',
        imageUrl:
          'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=640&q=80',
        author: 'Claire Dubois',
        location: 'NEW YORK',
        relatedIds: ['markets-001'],
        body: [
          'NEW YORK, April 20 (Reuters) — Several large retail chains are quietly accelerating trials of compact urban store formats as footfall data from suburban locations disappoints, marking a strategic pivot that could reshape their real estate portfolios over the next two to three years.',
          'Three major grocery and general merchandise retailers are opening stores of between 8,000 and 15,000 square feet in city-centre locations — roughly a third of the size of their standard suburban units — targeting commuters, city workers, and residents who prefer frequent, smaller shopping trips to less regular bulk purchases.',
          '"We are seeing a structural shift in how urban consumers shop," said one senior retail executive, who requested anonymity to discuss unannounced strategy. "They buy less, more often, and they want it close to where they live and work."',
          'The trend has important implications for the commercial real estate market. Analysts at two major property advisory firms said they expected lease restructuring — including returns of underperforming suburban space and signings of smaller urban units — to become a more prominent feature of retail earnings calls over the coming quarters.',
          'Suburban traffic declines are not universal. Several discount grocery formats have continued to post strong footfall growth in suburban areas as cost-conscious consumers trade down from premium supermarkets. Analysts said the divergence reflected the fragmentation of the retail landscape rather than a blanket retreat from suburban real estate.',
          'Online and delivery competition remains a significant factor. Several retail executives cited the continued growth of rapid-delivery grocery platforms as a reason to reduce large suburban footprints where fixed operating costs are harder to justify.',
          'Investors have rewarded the format experimentation selectively. Shares in one chain that announced an accelerated urban expansion programme last month rose nearly 5 percent on the day, while a rival whose suburban performance disappointed without a clear strategy update fell sharply.',
        ],
      },
    ],
    sections: [
      {
        id: 'world',
        title: 'World News',
        stories: [
          {
            id: 'world-001',
            category: 'Europe',
            title: 'Election coalition talks continue as budget rules dominate opening round',
            summary:
              'Party negotiators said progress was made on migration and labor reforms, while fiscal policy remains unresolved.',
            timestamp: '44 minutes ago',
            readTime: '5 min read',
            imageUrl:
              'https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?auto=format&fit=crop&w=960&q=80',
            author: 'Anna Fischer',
            location: 'BERLIN',
            relatedIds: ['lead-001', 'headline-001'],
            body: [
              'BERLIN, April 20 (Reuters) — Coalition negotiations following last month\'s federal election entered their second week on Sunday with the three leading parties reporting incremental progress on migration and labour market policy but acknowledging that disagreements over fiscal rules remained the central obstacle to a deal.',
              'Negotiators from the largest centre-right party, the leading social democratic group, and the smaller liberal alliance met for 11 hours on Saturday before breaking for the night. A brief statement released early Sunday said discussions had been "constructive" on the social agenda but that budget talks would require "further intensive effort."',
              'The core fiscal dispute centres on whether the incoming government can use a temporary exemption clause in the constitutional debt brake to fund a proposed infrastructure investment programme valued at approximately €150 billion over ten years. The centre-right bloc has resisted any loosening of the fiscal rules, while the social democrats argue the clause is legally available and economically necessary.',
              '"We are not going to agree to anything that creates a structural deficit," said the centre-right lead negotiator at a brief press appearance on Sunday afternoon. "The debt brake exists for a reason and we intend to honour it."',
              'The social democratic counterpart offered a different framing: "We are not talking about circumventing the rules. We are discussing what the rules explicitly allow. There is a meaningful difference."',
              'Analysts tracking the talks said the infrastructure argument was likely to be resolved through a compromise that separates the investment vehicle from the core federal budget — potentially through an off-balance-sheet fund of the kind used by previous governments, though critics say such structures undermine fiscal transparency.',
              'On migration, the negotiators are reported to have provisionally agreed on expanded processing capacity at land borders but have deferred questions about deportation arrangements with third countries to a later stage of talks. Labour market issues, including pension reform and minimum wage indexation, are understood to be closer to resolution.',
              'A fourth round of talks is scheduled for Tuesday. Observers expect at least three more weeks before a coalition agreement can be put to party congresses for approval.',
            ],
          },
          {
            id: 'world-002',
            category: 'Asia Pacific',
            title: 'Port operators deploy emergency schedules after weather disruptions',
            summary: 'Authorities warned shipping delays could continue through next week.',
            timestamp: '1 hour ago',
            readTime: '3 min read',
            imageUrl:
              'https://images.unsplash.com/photo-1473445361085-b9a07f55608b?auto=format&fit=crop&w=960&q=80',
            author: 'Kenji Watanabe',
            location: 'SINGAPORE',
            relatedIds: ['lead-001', 'world-003'],
            body: [
              'SINGAPORE, April 20 (Reuters) — Port authorities across Southeast Asia have activated contingency operating schedules after severe weather systems disrupted vessel movements at several major hubs over the weekend, with officials warning that cargo clearance backlogs could persist through at least the middle of next week.',
              'The Port of Singapore, one of the world\'s busiest container hubs, said it had deployed additional crane crews and extended gate operating hours to manage a queue of more than 80 vessels waiting at anchorage as of Sunday evening. A spokeswoman said the situation was "under active management" and that average waiting times had declined from a peak of 18 hours to approximately 11 hours.',
              'Operations at the port of Tanjung Pelepas in Malaysia and the Laem Chabang port complex in Thailand were also affected, with several shipping lines issuing force majeure notices covering specific cargo categories.',
              'The disruption has added to an already difficult operating environment for Asia-Pacific carriers. Longer haul diversions resulting from disruptions to northern shipping lanes earlier this year have already increased average transit times and reduced the effective supply of vessel capacity for intra-Asian trades.',
              '"Every week of disruption like this compounds," said a regional logistics director at a major freight forwarding firm, speaking by telephone from Singapore. "Shippers have already absorbed one shock to their planning cycles this year. Another one stretches inventory buffers that were already tight."',
              'Marine meteorologists said a second front was expected to pass through the Strait of Malacca on Tuesday and Wednesday, though models suggested it would be less intense than the system that caused this weekend\'s disruptions.',
            ],
          },
          {
            id: 'world-003',
            category: 'Americas',
            title: 'Agricultural exports rebound as rail bottlenecks start to clear',
            summary: 'Exporters report stronger bookings after two weeks of congestion.',
            timestamp: '3 hours ago',
            readTime: '4 min read',
            imageUrl:
              'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=960&q=80',
            author: 'Diana Reyes',
            location: 'CHICAGO',
            relatedIds: ['lead-001', 'markets-003'],
            body: [
              'CHICAGO, April 20 (Reuters) — Agricultural commodity exporters in the midwestern United States reported improved vessel booking conditions this week as rail operators cleared the last significant accumulation of freight cars that had been stuck waiting near the Gulf Coast, ending a congestion episode that had depressed soybean and corn export activity for nearly a fortnight.',
              'Grain elevator operators in Illinois, Iowa, and Indiana said train turnaround times at their facilities had returned to normal after two weeks in which delayed car returns forced them to slow loading operations and, in some cases, defer sales contracts.',
              '"We\'ve been waiting for this," said the manager of one large cooperative elevator in central Illinois. "When the rail gets backed up like that, it creates a ripple effect all the way back to the farm. We\'re catching up now but we lost time we can\'t fully recover."',
              'Soybean basis levels — the premium or discount relative to Chicago Board of Trade futures — firmed at several interior locations, reflecting the improved logistics outlook. Corn basis was also slightly stronger, though export demand for U.S. corn has been softer than for soybeans given competitive pricing from South American origins.',
              'Export inspections data released by the USDA confirmed stronger vessel loadings at Gulf ports during the week ending April 17, with soybean inspections up nearly 22 percent from the prior week. Traders said the rebound was partly catch-up from deferred shipments and partly genuine new demand.',
              'Rail operators attributed last month\'s congestion to a combination of maintenance work that temporarily reduced track capacity on a key corridor and an earlier-than-normal surge in demand from coal shippers. Both factors have now eased, they said.',
            ],
          },
        ],
      },
      {
        id: 'markets',
        title: 'Markets',
        stories: [
          {
            id: 'markets-001',
            category: 'Equities',
            title: 'Tech shares gain while utilities retreat in late-session rotation',
            summary: 'Investors rotated into growth names after upbeat enterprise earnings.',
            timestamp: '27 minutes ago',
            readTime: '3 min read',
            imageUrl:
              'https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=960&q=80',
            author: 'Tyler Brooks',
            location: 'NEW YORK',
            relatedIds: ['markets-002', 'headline-001'],
            body: [
              'NEW YORK, April 20 (Reuters) — U.S. technology shares outpaced the broader market in Monday\'s afternoon session as investors rotated into growth names following a cluster of upbeat enterprise software and cloud infrastructure earnings reports released over the weekend, while utilities and rate-sensitive sectors fell as Treasury yields ticked higher.',
              'The Nasdaq Composite rose 0.9 percent while the S&P 500 gained 0.6 percent. The broader Russell 2000 small-cap index was flat. The Dow Jones Industrial Average added 0.3 percent, held back by weakness in industrial and financial components.',
              'Enterprise software names led the gains. Three companies in the business productivity and cloud services segments reported quarterly results that exceeded analyst consensus estimates on both revenue and earnings per share. Guidance for the current quarter was also above prior street forecasts in two of the three cases.',
              '"The theme is AI monetisation finally showing up in reported numbers," said one portfolio manager at a mid-sized technology fund in New York. "For two years we\'ve been hearing about the potential. Now we\'re starting to see the revenues."',
              'Utilities fell 1.1 percent as the 10-year Treasury yield climbed two basis points to 4.41 percent following cautious comments from a Federal Reserve governor about the pace of potential rate reductions. Higher yields make the dividends paid by utilities less attractive relative to bonds.',
              'Energy stocks also declined, following crude oil prices lower after data showed rerouted crude cargoes arriving at Asian destinations had relieved some supply tightness. The S&P Energy sector fell 0.7 percent.',
              'Trading volume was above the 30-day average. Options market activity showed elevated call buying in several large-cap technology names, suggesting institutional investors were adding to bullish positions.',
            ],
          },
          {
            id: 'markets-002',
            category: 'Currencies',
            title: 'Dollar steadies as traders watch wage prints and bond demand',
            summary: 'Analysts said options positioning suggests a narrower near-term range.',
            timestamp: '1 hour ago',
            readTime: '4 min read',
            imageUrl:
              'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=960&q=80',
            author: 'Fiona McLellan',
            location: 'LONDON',
            relatedIds: ['headline-001', 'markets-001'],
            body: [
              'LONDON, April 20 (Reuters) — The dollar hovered in a narrow range against major currencies on Monday as foreign exchange traders positioned cautiously ahead of this week\'s U.S. wage data and a Treasury bond auction that will test appetite for dollar-denominated assets amid ongoing debate about the Federal Reserve\'s rate path.',
              'The DXY index, which measures the dollar against a basket of six currencies, was up 0.15 percent at 104.27 in early London trade after giving back some of Friday\'s gains in overnight Asia trading.',
              'Against the euro, the dollar firmed slightly to 1.0685 after European Central Bank officials reinforced the message that a June rate cut remained on the table if inflation continued to moderate. Traders said the ECB\'s more dovish tone relative to the Fed was providing limited but consistent support for the dollar.',
              'The yen remained under pressure despite the Bank of Japan\'s suggestion earlier in the weekend that further tightening was possible. USD/JPY traded at 153.70, not far from the multi-year highs reached last month, as investors continued to doubt that the pace of BoJ tightening would be rapid enough to significantly narrow the rate differential with the U.S.',
              '"The market is priced for a Fed on hold and an ECB cutting. That\'s dollar positive," said a senior FX strategist at a major European bank. "The question is whether the U.S. wage data on Wednesday gives any reason to revise that view."',
              'Options positioning in EUR/USD implied a narrow one-week range of 1.0640 to 1.0740, suggesting traders expected limited movement ahead of Wednesday\'s employment cost data.',
              'Sterling was flat at 1.2385. The pound has been range-bound for several weeks as investors assessed mixed signals from the UK economy — stronger-than-expected growth data offset by still-elevated services inflation.',
            ],
          },
          {
            id: 'markets-003',
            category: 'Commodities',
            title: 'Copper edges higher on inventory drawdowns and mine supply concerns',
            summary: 'Warehouse levels have fallen for four consecutive reporting sessions.',
            timestamp: '2 hours ago',
            readTime: '4 min read',
            imageUrl:
              'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=960&q=80',
            author: 'Samuel Okafor',
            location: 'LONDON',
            relatedIds: ['headline-002', 'world-003'],
            body: [
              'LONDON, April 20 (Reuters) — Copper prices edged higher on Monday, extending a modest recovery from last week\'s lows as inventories registered in London Metal Exchange warehouses declined for a fourth consecutive reporting session and concerns about mine supply disruptions in two major producing countries came back into focus.',
              'Three-month copper on the LME was up 0.7 percent at $9,427 per tonne by 1000 GMT. On the Shanghai Futures Exchange, the most active contract was up slightly less, constrained by subdued domestic demand signals from Chinese industrial data.',
              'LME warehouse stocks fell by 2,850 tonnes to 118,300 tonnes — their lowest level since late February. Analysts said the drawdown reflected genuine tightness in the prompt physical market rather than speculative inventory movements, with several smelters reporting difficulty securing spot concentrate.',
              'Supply concerns centred on two fronts. In South America, a major copper producing country is negotiating new royalty terms with mining companies, creating uncertainty about future investment and near-term operational decisions. In Central Africa, seasonal weather disruptions have slowed transportation of copper concentrate from inland mines to port.',
              '"Copper has a fundamental story to tell this year," said a metals analyst at a major commodities research firm in London. "The energy transition demand is real, it\'s growing, and mine supply is not keeping pace with the growth trajectory. Short-term volatility aside, the medium-term outlook is constructive."',
              'On the demand side, Chinese property sector data remains a drag. New home starts fell for the eighth consecutive month in March, weighing on construction-related copper demand. However, analysts noted that grid investment — driven by renewable energy expansion — was partly offsetting the property weakness.',
              'Aluminium, zinc, and nickel were broadly flat on the day. Lead edged slightly lower after a battery manufacturer in China announced reduced output guidance.',
            ],
          },
        ],
      },
      {
        id: 'technology',
        title: 'Technology',
        stories: [
          {
            id: 'tech-001',
            category: 'AI',
            title: 'Enterprise copilots move from pilot programs to procurement phase',
            summary:
              'Chief information officers are narrowing use cases to workflow automation and support operations.',
            timestamp: '35 minutes ago',
            readTime: '6 min read',
            imageUrl:
              'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=960&q=80',
            author: 'Laura Chen',
            location: 'SAN FRANCISCO',
            relatedIds: ['spotlight-001', 'tech-002'],
            body: [
              'SAN FRANCISCO, April 20 (Reuters) — Artificial intelligence "copilot" tools — software assistants that help employees with tasks ranging from writing code to drafting emails and summarising documents — are moving out of cautious pilot programmes at large enterprises and into formal procurement and deployment phases, according to technology buyers and vendors interviewed by Reuters.',
              'Chief information officers at more than a dozen large companies said they had either signed multi-year enterprise licences or were in final contractual negotiations for AI assistant software over the past six months, a significant acceleration compared with the prior year when most organisations limited AI deployments to controlled experiments.',
              '"We spent 18 months doing pilots," said the CIO of one large financial services firm, who asked not to be identified because budget decisions have not been publicly announced. "We have a clear picture now of where the productivity gains are real and where they are overstated. We are buying what works."',
              'The use cases with the strongest business cases, according to multiple CIOs, are software development assistance, customer support agent tools, internal document search and summarisation, and data analysis workflows that previously required specialist skills.',
              'More speculative use cases — including autonomous agents that plan and execute multi-step business processes — are still in early testing at most organisations, with buyers wary of the reliability and auditability challenges they present.',
              'The procurement shift is reflected in vendor revenues. Several enterprise software companies reported in their most recent earnings that AI-related annual recurring revenue had grown significantly, though analysts cautioned that some of the growth reflected upselling existing licences with AI features rather than entirely new spending.',
              'Headcount implications are beginning to emerge in some sectors. Several companies have quietly reduced hiring plans for junior roles in software testing, basic content production, and first-line customer support, though mass layoffs attributable to AI have not yet materialised at scale.',
              '"The productivity gains are real but so is the learning curve," said one enterprise technology consultant who works with Fortune 500 clients. "Companies that rushed to deploy AI without redesigning the workflows around it are not seeing the results. The ones that took time to do it properly are."',
            ],
          },
          {
            id: 'tech-002',
            category: 'Cybersecurity',
            title: 'Security teams expand passkey adoption to cut credential takeover risk',
            summary: 'Large employers report fewer account recovery incidents in early trials.',
            timestamp: '1 hour ago',
            readTime: '5 min read',
            imageUrl:
              'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=960&q=80',
            author: 'Ben Hartley',
            location: 'SAN FRANCISCO',
            relatedIds: ['tech-001', 'spotlight-001'],
            body: [
              'SAN FRANCISCO, April 20 (Reuters) — Corporate security teams are rapidly expanding deployments of passkey authentication — a technology that replaces passwords with cryptographic credentials stored on users\' devices — after early adopters reported significant reductions in account takeover incidents and help desk workload.',
              'Passkeys, which authenticate users through biometrics or device PIN rather than memorable passwords, have been available on major platforms for approximately two years. But adoption in enterprise environments has accelerated sharply in recent months as security teams seek to close the attack vectors that phishing and credential theft continue to exploit.',
              'Three large employers — a financial institution, a healthcare system, and a technology company — shared data with Reuters showing account recovery requests had fallen between 35 and 60 percent in the months following mandatory passkey rollouts, compared with the equivalent period a year earlier.',
              '"We were spending enormous amounts of security team and help desk time managing password resets and investigating credential theft alerts," said the chief information security officer at the healthcare organisation, who spoke on condition of anonymity. "Passkeys have materially changed that picture."',
              'The shift also reflects changing attacker behaviour. Security researchers at two firms said they had observed a marked increase in adversarial investment in social engineering attacks — attempts to trick users through phone calls or fake websites — as the technical barriers to credential theft rise.',
              '"Passkeys don\'t eliminate human deception as an attack vector," said one senior threat intelligence analyst. "But they do make most of the automated, opportunistic credential theft that accounts for a large share of breaches much harder to execute."',
              'Remaining adoption challenges include compatibility with legacy enterprise systems, resistance from employees used to password managers, and questions about what happens when users change devices or lose access to a passkey-enrolled device.',
              'Major identity platform vendors said they were investing in cross-device passkey synchronisation and account recovery flows that did not reintroduce the weaknesses passkeys were meant to eliminate.',
            ],
          },
          {
            id: 'tech-003',
            category: 'Telecom',
            title: 'Satellite operators court airlines with lower-latency cabin internet deals',
            summary: 'Rival constellations are expected to announce partnerships this quarter.',
            timestamp: '4 hours ago',
            readTime: '4 min read',
            imageUrl:
              'https://images.unsplash.com/photo-1532619187608-e5375cab36aa?auto=format&fit=crop&w=960&q=80',
            author: 'Emma Walsh',
            location: 'LONDON',
            relatedIds: ['spotlight-001'],
            body: [
              'LONDON, April 20 (Reuters) — Competing low-earth-orbit satellite internet operators are intensifying their pursuit of airline contracts, presenting revised performance specifications and terms after early deployments demonstrated that their latency and throughput figures had improved enough to meet the demands of video streaming and business traveller use cases.',
              'Several airlines have been evaluating upgrade proposals from at least two rival constellations over the past few months, according to people familiar with the discussions. Decisions on major contracts — which typically run five to ten years and involve hundreds of aircraft — are expected to be announced in the second and third quarters.',
              '"The technology has caught up with what we need," said a senior technology executive at one major airline, who declined to be named because contract negotiations are ongoing. "Two years ago there were genuine questions about whether low-earth-orbit could deliver a consistent experience at the scale we operate. Those questions have largely been answered."',
              'Latest-generation low-earth-orbit networks have cut median round-trip latency to around 25–40 milliseconds for airborne users — well below the 600-millisecond typical of geostationary satellite systems and comparable to ground-based broadband in many markets.',
              'The improvement has changed the economics of in-flight connectivity in two ways. For passengers, it enables real-time video calls and gaming that geostationary systems could not support reliably. For airlines, it opens the possibility of charging for tiered connectivity plans with premium features, rather than offering basic connectivity as an undifferentiated amenity.',
              'Competition is pushing pricing lower. Industry analysts estimate that per-seat per-month costs for low-earth-orbit service have fallen by approximately 40 percent over the past 18 months, driven by constellation scale and competitive pressure.',
              'One challenger constellation said in a statement it expected to announce two major airline partnerships before the end of the current quarter, though it declined to name the carriers or provide financial terms.',
            ],
          },
        ],
      },
    ],
    liveUpdates: [
      'Live Desk: Commodity volatility index opens 6% higher before easing mid-session.',
      'Breaking: Finance ministers schedule a second emergency call on cross-border logistics.',
      'Developing: Maritime insurers raise short-term premiums for high-risk routes.',
    ],
    editorPicks: [
      'How insurers are repricing risk in global shipping lanes',
      'Inside the race for grid-scale battery contracts',
      'Why CIOs are rewriting software budgets around AI copilots',
      'The return of long-term industrial policy in export markets',
    ],
    marketTicker: [
      { symbol: 'SPX',  value: '5,284.18',  change: '+0.64%', trend: 'up'   },
      { symbol: 'NDQ',  value: '18,730.42', change: '+0.89%', trend: 'up'   },
      { symbol: 'DJI',  value: '38,219.34', change: '-0.31%', trend: 'down' },
      { symbol: 'DXY',  value: '104.12',    change: '-0.18%', trend: 'down' },
    ],
  };

  getHomeContent(): HomeContent {
    return this.content;
  }

  /** Return every story in the dataset as a flat list for O(1) id lookup. */
  getAllStories(): NewsStory[] {
    const { leadStory, spotlightStory, topHeadlines, sections } = this.content;
    return [
      leadStory,
      spotlightStory,
      ...topHeadlines,
      ...sections.flatMap((s) => s.stories),
    ];
  }

  getStoryById(id: string): NewsStory | undefined {
    return this.getAllStories().find((s) => s.id === id);
  }

  filterSectionsByQuery(query: string): NewsSection[] {
    if (!query.trim()) {
      return this.content.sections;
    }

    const normalizedQuery = query.toLowerCase();

    return this.content.sections
      .map((section) => ({
        ...section,
        stories: section.stories.filter((story) =>
          [story.title, story.summary, story.category]
            .join(' ')
            .toLowerCase()
            .includes(normalizedQuery)
        ),
      }))
      .filter((section) => section.stories.length > 0);
  }

  // -- Live API methods ------------------------------------------------------

  /**
   * Fetch the latest headlines from the server-side NewsAPI proxy.
   * Falls back to the static story list on any error (API key missing, network).
   * Auto-refreshes every 15 minutes � matches the PRS Section 9.9 default interval.
   */
  /**
   * Headlines sourced from the local articles.json asset instead of the NewsAPI.
   * Uses the same ArticleService that fetchByTopics() uses.
   */
  readonly liveHeadlines = toSignal(
    isPlatformBrowser(this.platformId)
      ? this.articleService.getByTopics(['World', 'Business', 'Technology', 'Markets', 'Politics', 'Science'], 12).pipe(
          tap(() => {
            this.isLive.set(true);
            this.loadingState.set('ready');
          }),
          map(sections => sections.flatMap(s => s.stories).slice(0, 12)),
          catchError(() => {
            this.isLive.set(false);
            this.loadingState.set('error');
            return of(this.getAllStories().slice(0, 12));
          }),
        )
      : of(this.getAllStories().slice(0, 12)),
    { initialValue: this.getAllStories().slice(0, 12) },
  );

  /**
   * Fetch articles for a given set of topics � used by the generated app to
   * populate sections matching the user's personalisation config.
   * Falls back to static sections filtered by those topics on error.
   *
   * @param topics  User's selected Reuters topic names, e.g. ['Technology', 'Markets']
   * @param pageSize Number of articles to request per batch (max 20)
   */
  /**
   * Returns NewsSection[] from the local articles.json asset, filtered by topic.
   * No API call is made — data is served from the bundled asset.
   */
  fetchByTopics(topics: string[], pageSize = 20): Observable<NewsSection[]> {
    if (!topics.length) return of([]);
    if (!isPlatformBrowser(this.platformId)) return of([]);
    return this.articleService.getByTopics(topics, pageSize).pipe(
      tap(() => this.isLive.set(true)),
      catchError(() => {
        this.isLive.set(false);
        return of(this.staticSectionsForTopics(topics));
      }),
    );
  }

  /**
   * Fetch a single top-headlines category (e.g. 'business', 'technology').
   * Returns an empty array on failure so callers can fall back silently.
   */
  /**
   * Returns stories for a single category from the JSON asset.
   */
  fetchCategory(category: string, pageSize = 6): Observable<NewsStory[]> {
    return this.articleService.getByTopics([category], pageSize).pipe(
      map(sections => sections.flatMap(s => s.stories).slice(0, pageSize)),
      catchError(() => of([])),
    );
  }

  /**
   * Fetch news videos from the YouTube Data API proxy.
   * Uses the same topics the user selected for their personalised page.
   * Returns an empty array on any error so the videos section is simply hidden.
   *
   * @param topics  User's selected topic names, e.g. ['Technology', 'Markets']
   * @param pageSize Max videos to return (max 12, default 6)
   */
  /**
   * Videos are loaded from the JSON asset via VideoService (in the component).
   * This method is kept for compatibility but returns static fallback.
   */
  fetchVideos(topics: string[], pageSize = 6): Observable<VideoItem[]> {
    return of(this.staticVideosForTopics(topics, pageSize));
  }

  /**
   * Topic-keyed static video fallback used when no YouTube API key is configured.
   * All videos are from channels verified to allow iframe embedding:
   * TED (youtube.com/@TED), 3Blue1Brown, and Principles by Ray Dalio.
   */
  private staticVideosForTopics(topics: string[], limit = 6): VideoItem[] {

    // Verified-embeddable video library.
    // These channels publish all content with embedding explicitly allowed.
    const V = {
      neuralNet:   { id: 'aircAruvnKk', ch: '3Blue1Brown',             title: 'But What Is a Neural Network?',                  desc: 'An intuitive visual explanation of neural networks and how deep learning actually works.' },
      startups:    { id: 'bNpx7gpSqbY', ch: 'TED',                    title: 'The Single Biggest Reason Why Start-Ups Succeed', desc: 'Bill Gross analysed hundreds of companies to find the one factor that separates winners from losers.' },
      creativity:  { id: 'iG9CE55wbtY', ch: 'TED',                    title: 'Do Schools Kill Creativity?',                     desc: 'Sir Ken Robinson makes the case for an education system that nurtures rather than suppresses creativity.' },
      economic:    { id: 'PHe0bXAIuk0', ch: 'Principles by Ray Dalio', title: 'How the Economic Machine Works',                 desc: 'Ray Dalio explains economic cycles, credit, and what drives market booms and busts.' },
      outbreak:    { id: '6Af6b_wyiwI', ch: 'TED',                    title: "The Next Outbreak? We're Not Ready",              desc: "Bill Gates on global pandemic preparedness and the international coordination needed to stop the next outbreak." },
      singleStory: { id: 'D9Ihs241zeg', ch: 'TED',                    title: 'The Danger of a Single Story',                   desc: 'Chimamanda Ngozi Adichie on how stereotypes and single narratives shape our understanding of the world.' },
      grit:        { id: 'H14bBuluwB8', ch: 'TED',                    title: 'Grit: The Power of Passion and Perseverance',    desc: 'Angela Duckworth on what really predicts success and why talent alone is never enough.' },
      vulnerable:  { id: 'iCvmsMzlF7o', ch: 'TED',                   title: 'The Power of Vulnerability',                     desc: 'Brene Brown on courage, connection, and why vulnerability is the birthplace of innovation and change.' },
    };

    const mk = (slot: string, v: typeof V[keyof typeof V], category = 'world'): VideoItem => ({
      id: `yt-${slot}`, embeddable: true, channelTitle: v.ch, publishedAt: 'Featured', duration: '',
      category,
      title: v.title, description: v.desc,
      thumbnail: `https://i.ytimg.com/vi/${v.id}/hqdefault.jpg`,
      videoUrl:  `https://www.youtube.com/watch?v=${v.id}`,
    });

    const TOPIC_MAP: Record<string, VideoItem[]> = {
      technology: [ mk('t1', V.neuralNet, 'technology'),   mk('t2', V.startups, 'technology'),    mk('t3', V.creativity, 'technology')  ],
      markets:    [ mk('m1', V.economic, 'market'),    mk('m2', V.startups, 'market'),    mk('m3', V.grit, 'market')        ],
      world:      [ mk('w1', V.outbreak, 'world'),    mk('w2', V.singleStory, 'world'), mk('w3', V.grit, 'world')        ],
      business:   [ mk('b1', V.startups, 'business'),    mk('b2', V.economic, 'business')                             ],
      politics:   [ mk('p1', V.singleStory, 'politics'), mk('p2', V.outbreak, 'politics')                             ],
      science:    [ mk('sc1', V.neuralNet, 'science'),  mk('sc2', V.creativity, 'science')                          ],
      health:     [ mk('h1', V.outbreak, 'health'),    mk('h2', V.vulnerable, 'health')                           ],
      energy:     [ mk('e1', V.economic, 'energy'),    mk('e2', V.outbreak, 'energy')                             ],
      sports:     [ mk('sp1', V.grit, 'sports'),       mk('sp2', V.vulnerable, 'sports')                          ],
    };

    // Aliases so common variations map to a bucket
    const ALIASES: Record<string, string> = {
      tech: 'technology', ai: 'technology', cybersecurity: 'technology', telecom: 'technology',
      finance: 'markets', equities: 'markets', stocks: 'markets', economy: 'markets', currencies: 'markets', commodities: 'markets',
      'world news': 'world', international: 'world', global: 'world',
      policy: 'politics', government: 'politics', elections: 'politics',
      climate: 'energy', renewables: 'energy', oil: 'energy', gas: 'energy',
      medicine: 'health', healthcare: 'health',
      football: 'sports', soccer: 'sports',
    };

    const generalFallback: VideoItem[] = [
      mk('gen1', V.outbreak, 'world'),
      mk('gen2', V.economic, 'business'),
    ];

    // Collect videos from matching topic buckets
    const picked: VideoItem[] = [];
    const seen = new Set<string>();

    for (const topic of topics) {
      const key = topic.toLowerCase();
      const bucket = TOPIC_MAP[key] ?? TOPIC_MAP[ALIASES[key] ?? ''] ?? [];
      for (const v of bucket) {
        if (!seen.has(v.id) && picked.length < limit) {
          seen.add(v.id);
          picked.push(v);
        }
      }
    }

    // If not enough topic-specific videos, pad with general fallback
    if (picked.length < limit) {
      for (const v of generalFallback) {
        if (!seen.has(v.id) && picked.length < limit) {
          seen.add(v.id);
          picked.push(v);
        }
      }
    }

    return picked;
  }

  // -- Private helpers -------------------------------------------------------

  /**
   * Group a flat list of live articles into NewsSection objects keyed on the
   * user's selected topics. Each section gets up to 3 articles.
   */
  private groupArticlesIntoSections(articles: NewsStory[], topics: string[]): NewsSection[] {
    if (!articles.length) return this.staticSectionsForTopics(topics);

    // Split articles evenly across topics � show all, no per-section cap
    const chunkSize = Math.max(1, Math.floor(articles.length / topics.length));
    return topics.map((topic, i) => ({
      id:     topic.toLowerCase(),
      title:  topic,
      stories: articles.slice(i * chunkSize, i * chunkSize + chunkSize),
    })).filter((s) => s.stories.length > 0);
  }

  /** Filter the static sections to only include those matching the given topics. */
  private staticSectionsForTopics(topics: string[]): NewsSection[] {
    const lower = topics.map((t) => t.toLowerCase());
    const matched = this.content.sections.filter((s) =>
      lower.some((t) => s.id.includes(t) || s.title.toLowerCase().includes(t))
    );
    return matched.length ? matched : this.content.sections;
  }
}
