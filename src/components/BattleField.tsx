import React, { useCallback, useMemo } from "react";
import classes from "./battleField.module.scss";

type PokemonWithMove = {
  pokemon: {
    name: string;
    sprites: { front_default: string };
  };
  move: { name: string; power: number | null };
};

type BattleFieldProps = {
  pokemons: PokemonWithMove[];
  onStartBattle: () => void;
  loading?: boolean;
};

const BATTLE_MESSAGES = {
  DECISIVE_BLOW: (winner: string, move: string, loser: string) =>
    `${winner.toUpperCase()} lands a decisive blow with ${move.toUpperCase()}, knocking out ${loser.toUpperCase()}!`,
  TIE: "It's a tie! Both Pokemon are evenly matched!",
  LOADING: "Preparing for battle...",
} as const;

const determineBattleOutcome = (
  p1: PokemonWithMove,
  p2: PokemonWithMove
): string => {
  const power1 = p1.move.power;
  const power2 = p2.move.power;

  if (power1 !== null && power2 !== null) {
    if (power1 > power2) {
      return BATTLE_MESSAGES.DECISIVE_BLOW(
        p1.pokemon.name,
        p1.move.name,
        p2.pokemon.name
      );
    }
    if (power2 > power1) {
      return BATTLE_MESSAGES.DECISIVE_BLOW(
        p2.pokemon.name,
        p2.move.name,
        p1.pokemon.name
      );
    }
    return BATTLE_MESSAGES.TIE;
  }

  if (power1 === null && power2 !== null) {
    return BATTLE_MESSAGES.DECISIVE_BLOW(
      p2.pokemon.name,
      p2.move.name,
      p1.pokemon.name
    );
  }
  if (power1 !== null && power2 === null) {
    return BATTLE_MESSAGES.DECISIVE_BLOW(
      p1.pokemon.name,
      p1.move.name,
      p2.pokemon.name
    );
  }

  return BATTLE_MESSAGES.TIE;
};

const PokemonCard = React.memo(
  ({ pokemonWithMove }: { pokemonWithMove: PokemonWithMove }) => {
    const { pokemon, move } = pokemonWithMove;

    return (
      <div>
        <div>
          <img
            src={pokemon.sprites.front_default || ""}
            alt={`${pokemon.name} sprite`}
            className={classes.pokemon}
          />
          <div className={classes.pokemonInfo}>
            <div>{pokemon.name.toUpperCase()}</div>
            <div className={classes.pWM}>
              <p>{move.name.charAt(0).toUpperCase() + move.name.slice(1)}:</p>
              <p>{move.power ?? 0}</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

PokemonCard.displayName = "PokemonCard";

function BattleField({
  pokemons,
  onStartBattle,
  loading = false,
}: BattleFieldProps) {
  const isValidBattle = useMemo(() => {
    return (
      Array.isArray(pokemons) &&
      pokemons.length >= 2 &&
      pokemons.every(
        (p) => p?.pokemon?.name && p?.move?.name && p?.pokemon?.sprites
      )
    );
  }, [pokemons]);

  const battleOutcome = useMemo(() => {
    if (!isValidBattle) return BATTLE_MESSAGES.LOADING;

    const [p1, p2] = pokemons;
    return determineBattleOutcome(p1, p2);
  }, [pokemons, isValidBattle]);

  const pokemonCards = useMemo(() => {
    if (!isValidBattle) return null;

    return pokemons
      .slice(0, 2)
      .map((pwm, index) => (
        <PokemonCard
          key={`${pwm.pokemon.name}-${index}`}
          pokemonWithMove={pwm}
        />
      ));
  }, [pokemons, isValidBattle]);

  const handleStartBattle = useCallback(() => {
    if (!loading) {
      onStartBattle();
    }
  }, [onStartBattle, loading]);

  if (!isValidBattle) {
    return <div>{BATTLE_MESSAGES.LOADING}</div>;
  }

  return (
    <div className={classes.battleField}>
      <div className={classes.cardsField}>{pokemonCards}</div>
      <div className={classes.battleLog}>
        <div className={classes.battleOutcome}>
          <p>{battleOutcome}</p>
        </div>
        <div>
          <button onClick={handleStartBattle} disabled={loading}>
            {loading ? "Getting new Pokemon..." : "Start Battle!"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BattleField;
