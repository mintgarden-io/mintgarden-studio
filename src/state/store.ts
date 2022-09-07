import Store from 'electron-store';
import { chiaRoot } from 'chia-agent';

export interface Collection {
  id: string;
  name: string;
  description: string;
  iconUrl?: string;
  bannerUrl?: string;
  twitterHandle?: string;
  website?: string;
  licenseUrl?: string;
  licenseHash?: string;
  attributes: { trait_type: string }[];
}

export const store = new Store<{ CHIA_ROOT: string; collections: { [id: string]: Collection } }>({
  defaults: { CHIA_ROOT: chiaRoot, collections: {} },
  migrations: {
    '0.1.6': (store) => {
      const collections = store.get('collections');

      for (const key of Object.keys(collections)) {
        collections[key].attributes = collections[key].attributes.map((oldAttribute: any) => ({
          trait_type: oldAttribute.name,
        }));
      }
      store.set('collections', collections);
    },
  },
});
