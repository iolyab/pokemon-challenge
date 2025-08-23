import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import BattleField from "./BattleField";

type Pokemon = {
  name: string;
  sprites: {
    front_default: string;
  };
  moves: {
    move: {
      name: string;
      url: string;
    };
  }[];
};

type Move = {
  name: string;
  power: number | null;
};

type PokemonWithMove = {
  pokemon: Pokemon;
  move: Move;
};

class Cache<T> {
  private cache = new Map<string, T>();
  private maxSize: number;

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  get(key: string): T | undefined {
    return this.cache.get(key);
  }

  set(key: string, value: T): void {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }

  clear(): void {
    this.cache.clear();
  }
}

const pokemonCache = new Cache<Pokemon>(50);
const moveCache = new Cache<Move>(200);
const activeRequests = new Map<string, Promise<any>>();

const getPokemon = async (id: number): Promise<Pokemon> => {
  const cacheKey = id.toString();
  const cached = pokemonCache.get(cacheKey);
  if (cached) return cached;

  if (activeRequests.has(cacheKey)) {
    return activeRequests.get(cacheKey)!;
  }

  const request = axios
    .get<Pokemon>(`https://pokeapi.co/api/v2/pokemon/${id}`, { timeout: 10000 })
    .then((res) => {
      pokemonCache.set(cacheKey, res.data);
      activeRequests.delete(cacheKey);
      return res.data;
    })
    .catch((error) => {
      activeRequests.delete(cacheKey);
      throw error;
    });

  activeRequests.set(cacheKey, request);
  return request;
};

const getMove = async (url: string, name: string): Promise<Move> => {
  const cached = moveCache.get(name);
  if (cached) return cached;

  if (activeRequests.has(name)) {
    return activeRequests.get(name)!;
  }

  const request = axios
    .get(url, { timeout: 10000 })
    .then((res) => {
      const move: Move = { name, power: res.data.power };
      moveCache.set(name, move);
      activeRequests.delete(name);
      return move;
    })
    .catch((error) => {
      activeRequests.delete(name);
      throw error;
    });

  activeRequests.set(name, request);
  return request;
};

const getRandomPokemonIds = (count: number, maxId: number): number[] => {
  const ids = new Set<number>();
  while (ids.size < count) {
    ids.add(Math.floor(Math.random() * maxId) + 1);
  }
  return Array.from(ids);
};

function GetRandomPokemon() {
  const [pokemons, setPokemons] = useState<PokemonWithMove[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const getTwoRandomPokemons = async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    setLoading(true);
    setError(null);

    try {
      const maxId = 151;
      const [id1, id2] = getRandomPokemonIds(2, maxId);

      const [p1, p2] = await Promise.all([getPokemon(id1), getPokemon(id2)]);

      if (abortController.signal.aborted) return;

      const pokemonsWithMoves: PokemonWithMove[] = await Promise.all(
        [p1, p2].map(async (p) => {
          if (p.moves.length === 0) {
            return {
              pokemon: p,
              move: { name: "No moves available", power: null },
            };
          }

          const randomMove =
            p.moves[Math.floor(Math.random() * p.moves.length)].move;
          const move = await getMove(randomMove.url, randomMove.name);

          return { pokemon: p, move };
        })
      );

      if (!abortController.signal.aborted) {
        setPokemons(pokemonsWithMoves);
        setLoading(false);
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        setError(
          err instanceof Error ? err.message : "Failed to fetch Pokémon"
        );
        setPokemons([]);
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    getTwoRandomPokemons();

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return (
    <div>
      {loading && <div>Loading Pokémon...</div>}

      {error && (
        <div>
          <div>Error: {error}</div>
          <button onClick={getTwoRandomPokemons}>Try Again!</button>
        </div>
      )}

      {!loading && !error && (
        <BattleField
          pokemons={pokemons}
          onStartBattle={getTwoRandomPokemons}
          loading={loading}
        />
      )}
    </div>
  );
}

export default GetRandomPokemon;
