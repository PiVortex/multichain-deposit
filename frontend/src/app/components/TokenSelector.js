'use client';

import { useState, useEffect } from 'react';
import { getChainDisplayName } from '../../utils/chainNames';
import { tokenList } from '../../utils/tokenList';

export default function TokenSelector({ onAssetSelect, onChainSelect, onTokensLoaded }) {
  const [tokens, setTokens] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAssetName, setSelectedAssetName] = useState('');
  const [selectedChainId, setSelectedChainId] = useState('');

  useEffect(() => {
    async function fetchAssets() {
      try {
        // Make an api call to get the supported tokens
        const response = await fetch('https://bridge.chaindefuser.com/rpc', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 1,
            jsonrpc: '2.0',
            method: 'supported_tokens',
            params: [{ chains: [] }],
          }),
        });

        if (!response.ok) throw new Error('Failed to fetch assets');
        const data = await response.json();
        
        // Filter to only have tokens that use the POA bridge
        const validTokens = data.result.tokens.filter(apiToken => {
          const token_id = apiToken.intents_token_id; 
          return tokenList.some(listToken => {
            if (listToken.defuseAssetId === token_id && listToken.bridge === "poa") {
              return true;
            }
            if (listToken.groupedTokens) {
              return listToken.groupedTokens.some(groupedToken => 
                groupedToken.defuseAssetId === token_id && groupedToken.bridge === "poa"
              );
            }
            return false;
          });
        });

        setTokens(validTokens);
        onTokensLoaded && onTokensLoaded(validTokens);

        // Set default asset and chain
        if (validTokens.length > 0) {
          const firstAsset = validTokens[0].asset_name;
          setSelectedAssetName(firstAsset);
          onAssetSelect && onAssetSelect(validTokens[0]);
          const chainsForAsset = validTokens.filter(t => t.asset_name === firstAsset);
          if (chainsForAsset.length > 0) {
            setSelectedChainId(chainsForAsset[0].defuse_asset_identifier);
            onChainSelect && onChainSelect(chainsForAsset[0]);
          }
        }
      } catch (error) {
        setError(error.message);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAssets();
  }, [onAssetSelect, onChainSelect, onTokensLoaded]);

  // Get unique asset names
  const uniqueAssets = [...new Set(tokens.map(token => token.asset_name))];
  // Get chains for selected asset
  const availableChains = tokens.filter(token => token.asset_name === selectedAssetName);

  const handleAssetChange = (event) => {
    const assetName = event.target.value;
    setSelectedAssetName(assetName);
    const chainsForAsset = tokens.filter(t => t.asset_name === assetName);
    if (chainsForAsset.length > 0) {
      setSelectedChainId(chainsForAsset[0].defuse_asset_identifier);
      onAssetSelect && onAssetSelect(chainsForAsset[0]);
      onChainSelect && onChainSelect(chainsForAsset[0]);
    }
  };

  const handleChainChange = (event) => {
    setSelectedChainId(event.target.value);
    const selectedToken = tokens.find(t => t.defuse_asset_identifier === event.target.value);
    if (selectedToken) {
      onChainSelect && onChainSelect(selectedToken);
    }
  };

  if (error) {
    return (
      <div className="text-red-500 mb-6 bg-red-50 p-4 rounded-lg border border-red-200">
        {error}
      </div>
    );
  }
  if (isLoading) {
    return (
      <div className="text-indigo-600 bg-indigo-50 p-4 rounded-lg mb-6">
        Loading assets...
      </div>
    );
  }

  return (
    <div className="flex flex-col md:flex-row gap-4 mb-4">
      <div className="flex-1">
        <label htmlFor="asset-select" className="block text-gray-600 mb-2">Select Asset:</label>
        <select
          id="asset-select"
          value={selectedAssetName}
          onChange={handleAssetChange}
          className="block w-full max-w-xs px-3 py-2 bg-white border-2 border-indigo-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
        >
          {uniqueAssets.map((assetName) => (
            <option key={assetName} value={assetName}>{assetName}</option>
          ))}
        </select>
      </div>
      <div className="flex-1">
        <label htmlFor="chain-select" className="block text-gray-600 mb-2">Select Chain:</label>
        <select
          id="chain-select"
          value={selectedChainId}
          onChange={handleChainChange}
          className="block w-full max-w-xs px-3 py-2 bg-white border-2 border-indigo-200 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-gray-700"
        >
          {availableChains.map((token) => {
            const chain = token.defuse_asset_identifier.split(':').slice(0, 2).join(':');
            return (
              <option key={token.defuse_asset_identifier} value={token.defuse_asset_identifier}>
                {getChainDisplayName(chain)}
              </option>
            );
          })}
        </select>
      </div>
    </div>
  );
} 