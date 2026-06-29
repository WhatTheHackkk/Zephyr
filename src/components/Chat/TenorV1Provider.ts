import type { GifProvider } from 'gif-picker-react';

export class TenorV1Provider implements GifProvider {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async getTrending() {
    const params = new URLSearchParams({
      key: this.apiKey,
      limit: '50'
    });
    
    const data = await fetch(`https://api.tenor.com/v1/trending?${params}`).then(res => res.json());
    return (data.results || []).map((item: any) => this.toGif(item));
  }

  async search(term: string) {
    const params = new URLSearchParams({
      key: this.apiKey,
      q: term,
      limit: '50'
    });
    
    const data = await fetch(`https://api.tenor.com/v1/search?${params}`).then(res => res.json());
    return (data.results || []).map((item: any) => this.toGif(item));
  }

  async getCategories() {
    const data = await fetch(`https://api.tenor.com/v1/categories?key=${this.apiKey}`).then(res => res.json());
    return (data.tags || []).map((category: any) => ({
      name: category.searchterm,
      imageUrl: category.image
    }));
  }

  private toGif(item: any) {
    const format = item.media[0].gif;
    const tiny = item.media[0].tinygif;
    return {
      id: item.id,
      imageUrl: format.url,
      width: format.dims[0],
      height: format.dims[1],
      description: item.title || item.content_description || 'GIF',
      preview: {
        imageUrl: tiny.url,
        width: tiny.dims[0],
        height: tiny.dims[1]
      },
      provider: 'tenor',
      raw: item
    };
  }
}
