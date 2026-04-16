import { Injectable } from '@angular/core';

import { HomeContent, NewsSection } from '../models/news.model';

@Injectable({
  providedIn: 'root'
})
export class NewsContentService {
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
        'https://images.unsplash.com/photo-1471286174890-9c112ffca5b4?auto=format&fit=crop&w=1280&q=80'
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
        'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1280&q=80'
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
          'https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?auto=format&fit=crop&w=640&q=80'
      },
      {
        id: 'headline-002',
        category: 'Energy',
        title: 'Refinery outages raise diesel futures while cargo rerouting eases crude pressure',
        summary: 'Traders expect volatility to remain elevated through next month.',
        timestamp: '52 minutes ago',
        readTime: '5 min read',
        imageUrl:
          'https://images.unsplash.com/photo-1473341304170-971dccb5ac1e?auto=format&fit=crop&w=640&q=80'
      },
      {
        id: 'headline-003',
        category: 'Business',
        title: 'Retail groups test smaller urban formats to offset slower suburban traffic',
        summary: 'Analysts expect lease restructuring to become a bigger theme this quarter.',
        timestamp: '2 hours ago',
        readTime: '4 min read',
        imageUrl:
          'https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&w=640&q=80'
      }
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
              'https://images.unsplash.com/photo-1496568816309-51d7c20e3b21?auto=format&fit=crop&w=960&q=80'
          },
          {
            id: 'world-002',
            category: 'Asia Pacific',
            title: 'Port operators deploy emergency schedules after weather disruptions',
            summary: 'Authorities warned shipping delays could continue through next week.',
            timestamp: '1 hour ago',
            readTime: '3 min read',
            imageUrl:
              'https://images.unsplash.com/photo-1473445361085-b9a07f55608b?auto=format&fit=crop&w=960&q=80'
          },
          {
            id: 'world-003',
            category: 'Americas',
            title: 'Agricultural exports rebound as rail bottlenecks start to clear',
            summary: 'Exporters report stronger bookings after two weeks of congestion.',
            timestamp: '3 hours ago',
            readTime: '4 min read',
            imageUrl:
              'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?auto=format&fit=crop&w=960&q=80'
          }
        ]
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
              'https://images.unsplash.com/photo-1642790106117-e829e14a795f?auto=format&fit=crop&w=960&q=80'
          },
          {
            id: 'markets-002',
            category: 'Currencies',
            title: 'Dollar steadies as traders watch wage prints and bond demand',
            summary: 'Analysts said options positioning suggests a narrower near-term range.',
            timestamp: '1 hour ago',
            readTime: '4 min read',
            imageUrl:
              'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?auto=format&fit=crop&w=960&q=80'
          },
          {
            id: 'markets-003',
            category: 'Commodities',
            title: 'Copper edges higher on inventory drawdowns and mine supply concerns',
            summary: 'Warehouse levels have fallen for four consecutive reporting sessions.',
            timestamp: '2 hours ago',
            readTime: '4 min read',
            imageUrl:
              'https://images.unsplash.com/photo-1610375461246-83df859d849d?auto=format&fit=crop&w=960&q=80'
          }
        ]
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
              'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=960&q=80'
          },
          {
            id: 'tech-002',
            category: 'Cybersecurity',
            title: 'Security teams expand passkey adoption to cut credential takeover risk',
            summary: 'Large employers report fewer account recovery incidents in early trials.',
            timestamp: '1 hour ago',
            readTime: '5 min read',
            imageUrl:
              'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&w=960&q=80'
          },
          {
            id: 'tech-003',
            category: 'Telecom',
            title: 'Satellite operators court airlines with lower-latency cabin internet deals',
            summary: 'Rival constellations are expected to announce partnerships this quarter.',
            timestamp: '4 hours ago',
            readTime: '4 min read',
            imageUrl:
              'https://images.unsplash.com/photo-1532619187608-e5375cab36aa?auto=format&fit=crop&w=960&q=80'
          }
        ]
      }
    ],
    liveUpdates: [
      'Live Desk: Commodity volatility index opens 6% higher before easing mid-session.',
      'Breaking: Finance ministers schedule a second emergency call on cross-border logistics.',
      'Developing: Maritime insurers raise short-term premiums for high-risk routes.'
    ],
    editorPicks: [
      'How insurers are repricing risk in global shipping lanes',
      'Inside the race for grid-scale battery contracts',
      'Why CIOs are rewriting software budgets around AI copilots',
      'The return of long-term industrial policy in export markets'
    ],
    marketTicker: [
      {
        symbol: 'SPX',
        value: '5,284.18',
        change: '+0.64%',
        trend: 'up'
      },
      {
        symbol: 'NDQ',
        value: '18,730.42',
        change: '+0.89%',
        trend: 'up'
      },
      {
        symbol: 'DJI',
        value: '38,219.34',
        change: '-0.31%',
        trend: 'down'
      },
      {
        symbol: 'DXY',
        value: '104.12',
        change: '-0.18%',
        trend: 'down'
      }
    ]
  };

  getHomeContent(): HomeContent {
    return this.content;
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
        )
      }))
      .filter((section) => section.stories.length > 0);
  }
}
