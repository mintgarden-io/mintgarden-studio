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
  attributes: { name: string }[];
}

export const store = new Store<{ CHIA_ROOT: string; collections: { [id: string]: Collection } }>({
  defaults: { CHIA_ROOT: chiaRoot, collections: {} },
});
