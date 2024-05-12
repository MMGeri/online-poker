import _ from 'lodash';
import { ICard, IGame, IPlayer } from '../models/game';
import { IUser } from '../models';
import { HybridEvent, NewStateResult, SafeGameState, SafePlayer } from './game-events.model';

function removeSensitiveData(gameState: IGame): Partial<SafeGameState> {
    const { players } = gameState;
    let secureGameState: Partial<SafeGameState> = _.cloneDeep(gameState);

    const securePlayers = new Map<string, SafePlayer>();
    for (const [key, player] of Object.entries(players)) {
        const { cards, ...playerDataWithoutCards } = player;
        securePlayers.set(key, playerDataWithoutCards);
    }

    secureGameState.players = securePlayers;
    secureGameState = _.omit(secureGameState, ['cardsInDeck']);

    return secureGameState;
}

function allDoneCondition(result: NewStateResult) {
    return (player: IPlayer) => player.called ||
        player.folded ||
        player.inGameBalance === 0 ||
        player.raisedTimes >= result.newState.options.maxRaises;
}


function calculateValueOfHand(cards: ICard[]): number {
    const valuesMap: { [key: string]: number } = {
        '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6, '8': 7, '9': 8, '10': 9, 'J': 10, 'Q': 11, 'K': 12, 'A': 13
    };
    const isStraight = (cs: ICard[]) => {
        const groupedBySign = _.groupBy(cs, 'sign');
        const hasFiveSameSign = _.some(groupedBySign, (group) => group.length >= 5);
        if (!hasFiveSameSign) {
            return null;
        }
        const groupWithFive = _.find(groupedBySign, (group) => group.length >= 5);
        if (!groupWithFive) {
            return null;
        }
        const areConsecutive = _.every(groupWithFive, (card, index, array) => {
            if (index === 0) {
                return true;
            }
            return valuesMap[card.value] - valuesMap[array[index - 1].value] === 1;
        });
        if (!areConsecutive) {
            return null;
        }
        const highestCard = valuesMap[_.maxBy(groupWithFive, (card) => valuesMap[card.value])?.value!];
        return highestCard;
    };
    const isFlush = (cs: ICard[]) => {
        const groupedBySign = _.groupBy(cs, 'sign');
        const fiveSameSignGroup = _.find(groupedBySign, (group) => group.length >= 5);
        if (!fiveSameSignGroup) {
            return null;
        }
        return valuesMap[_.maxBy(fiveSameSignGroup, (card) => valuesMap[card.value])!.value]!;
    };
    const isRoyalFlush = (cs: ICard[]) => {
        const straight = isStraight(cs);
        const flush = isFlush(cs);
        const ace = cs.find((c) => c.value === 'A');
        return straight && ace && flush;
    };
    const isStraightFlush = (cs: ICard[]) => {
        const straight = isStraight(cs);
        const flush = isFlush(cs);
        return straight && flush;
    };
    const isFourOfAKind = (cs: ICard[]) => {
        const groupedByValue = _.groupBy(cs, 'value');
        const fourSameValue = _.filter(groupedByValue, (group) => group.length === 4);
        return 4 * valuesMap[fourSameValue[0][0].value];
    };
    const isFullHouse = (cs: ICard[]) => {
        const groupedByValue = _.groupBy(cs, 'value');
        const threeSameValue = _.filter(groupedByValue, (group) => group.length === 3);
        const twoSameValue = _.filter(groupedByValue, (group) => group.length === 2);
        return 3 * valuesMap[threeSameValue[0][0].value] + 2 * valuesMap[twoSameValue[0][0].value];
    };
    const isThreeOfAKind = (cs: ICard[]) => {
        const groupedByValue = _.groupBy(cs, 'value');
        const hasThreeSameValue = _.some(groupedByValue, (group) => group.length === 3);
        return hasThreeSameValue;
    };
    const isTwoPair = (cs: ICard[]) => {
        const groupedByValue = _.groupBy(cs, 'value');
        const hasTwoSameValue = _.filter(groupedByValue, (group) => group.length === 2).length >= 2;
        return hasTwoSameValue;
    };
    const isOnePair = (cs: ICard[]) => {
        const groupedByValue = _.groupBy(cs, 'value');
        const hasTwoSameValue = _.some(groupedByValue, (group) => group.length === 2);
        return hasTwoSameValue;
    };

    if (isRoyalFlush(cards)) {
        return 245 + isStraight(cards)!;
    }
    if (isStraightFlush(cards)) {
        return 308 + isStraight(cards)!;
    }
    if (isFourOfAKind(cards)) {
        return 256 + isFourOfAKind(cards);
    }
    if (isFullHouse(cards)) {
        return 193 + isFullHouse(cards);
    }
    if (isFlush(cards)) {
        return 180 + isFlush(cards)!;
    }
    if (isStraight(cards)) {
        return 167 + isStraight(cards)!;
    }
    if (isThreeOfAKind(cards)) {
        const three = _.find(_.groupBy(cards, 'value'), (group) => group.length === 3)![0];
        return 128 + valuesMap[three.value] * 3;
    }
    if (isTwoPair(cards)) {
        const pairs = _.filter(_.groupBy(cards, 'value'), (group) => group.length === 2);
        return 76 + valuesMap[pairs[0][0].value] * 2 + valuesMap[pairs[1][0].value] * 2;
    }
    if (isOnePair(cards)) {
        const pair = _.find(_.groupBy(cards, 'value'), (group) => group.length === 2)![0];
        return 76 + valuesMap[pair[0].value] * 2;
    }
    return _.sumBy(cards, (card) => valuesMap[card.value]);
}

function calculateMoneyNeeded(newState: IGame, event: HybridEvent) {
    const beforePreFlop = newState.phase === 'Getting-Ready';
    const isPlayerBlind = newState.players[event.userId].positionAtTable === 0;
    const isPlayerBetZero = newState.players[event.userId].bet === 0;
    const moneyForBlinds = beforePreFlop && isPlayerBlind && isPlayerBetZero ? 1 : 0;
    return _.maxBy(Object.values(newState.players), 'bet').bet - newState.players[event.userId].bet + moneyForBlinds;
}

function isBSONType(id: string) {
    return /^[a-f\d]{24}$/i.test(id);
}

function secureUser(user: IUser) {
    return _.omit(user, ['hashedPassword', 'balance', 'friends', 'createdAt']);
}

export {
    secureUser,
    isBSONType,
    removeSensitiveData,
    allDoneCondition,
    calculateValueOfHand,
    calculateMoneyNeeded
};
