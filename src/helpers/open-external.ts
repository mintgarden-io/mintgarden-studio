import { shell } from 'electron';
import { chiaState } from '../state/chia';

export async function openNftOnMintGarden(nft: any) {
  const isTestnet = chiaState.networkName !== 'mainnet';

  return shell.openExternal(
    `https://${isTestnet ? 'testnet.' : ''}mintgarden.io/nfts${nft ? `/${nft.encoded_id || nft.encodedId}` : ''}`
  );
}
