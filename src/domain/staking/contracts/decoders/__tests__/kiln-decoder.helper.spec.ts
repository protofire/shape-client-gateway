import {
  batchWithdrawCLFeeEncoder,
  depositEncoder,
  depositEventEventBuilder,
  requestValidatorsExitEncoder,
} from '@/domain/staking/contracts/decoders/__tests__/encoders/kiln-encoder.builder';
import { KilnDecoder } from '@/domain/staking/contracts/decoders/kiln-decoder.helper';
import { ILoggingService } from '@/logging/logging.interface';
import { faker } from '@faker-js/faker';

const mockLoggingService = {
  debug: jest.fn(),
  error: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
} as jest.MockedObjectDeep<ILoggingService>;

// TODO: Move function encoding to kiln-encoder.builder.ts
describe('KilnDecoder', () => {
  let kilnDecoder: KilnDecoder;

  beforeEach(() => {
    kilnDecoder = new KilnDecoder(mockLoggingService);
  });

  describe('decodeDeposit', () => {
    it('decodes a deposit function call correctly', () => {
      const data = depositEncoder().encode();
      expect(kilnDecoder.decodeDeposit(data)).toEqual({
        method: 'deposit',
        parameters: [],
      });
    });

    it('returns null if the data is not a deposit function call', () => {
      const data = faker.string.hexadecimal({ length: 1 }) as `0x${string}`;
      expect(kilnDecoder.decodeDeposit(data)).toBeNull();
    });

    it('returns null if the data is another Kiln function call', () => {
      const data = requestValidatorsExitEncoder().encode();
      expect(kilnDecoder.decodeDeposit(data)).toBeNull();
    });
  });

  describe('decodeValidatorsExit', () => {
    it('decodes a requestValidatorsExit function call correctly', () => {
      const requestValidatorsExist = requestValidatorsExitEncoder();
      const { _publicKeys } = requestValidatorsExist.build();
      const data = requestValidatorsExist.encode();
      expect(kilnDecoder.decodeValidatorsExit(data)).toEqual({
        method: 'requestValidatorsExit',
        parameters: [
          {
            name: '_publicKeys',
            type: 'bytes',
            value: _publicKeys,
            valueDecoded: null,
          },
        ],
      });
    });

    it('returns null if the data is not a requestValidatorsExit function call', () => {
      const data = faker.string.hexadecimal({ length: 1 }) as `0x${string}`;
      expect(kilnDecoder.decodeValidatorsExit(data)).toBeNull();
    });

    it('returns null if the data is another Kiln function call', () => {
      const data = depositEncoder().encode();
      expect(kilnDecoder.decodeValidatorsExit(data)).toBeNull();
    });
  });

  describe('decodeBatchWithdrawCLFee', () => {
    it('decodes a batchWithdrawCLFee function call correctly', () => {
      const decodeBatchWithdrawCLFee = batchWithdrawCLFeeEncoder();
      const { _publicKeys } = decodeBatchWithdrawCLFee.build();
      const data = decodeBatchWithdrawCLFee.encode();
      expect(kilnDecoder.decodeBatchWithdrawCLFee(data)).toEqual({
        method: 'batchWithdrawCLFee',
        parameters: [
          {
            name: '_publicKeys',
            type: 'bytes',
            value: _publicKeys,
            valueDecoded: null,
          },
        ],
      });
    });

    it('returns null if the data is not a batchWithdrawCLFee function call', () => {
      const data = faker.string.hexadecimal({ length: 1 }) as `0x${string}`;
      expect(kilnDecoder.decodeBatchWithdrawCLFee(data)).toBeNull();
    });

    it('returns null if the data is another Kiln function call', () => {
      const data = depositEncoder().encode();
      expect(kilnDecoder.decodeBatchWithdrawCLFee(data)).toBeNull();
    });
  });

  describe('decodeDepositEvent', () => {
    it('decodes a deposit event correctly', () => {
      const depositEventEvent = depositEventEventBuilder();
      const { data, topics } = depositEventEvent.encode();

      expect(
        kilnDecoder.decodeDepositEvent({
          data,
          topics,
        }),
      ).toStrictEqual(depositEventEvent.build());
    });

    // Note: we cannot test whether null is returned for a non-DepositEvent
    // as only DepositEvent is included in the ABI

    it('returns null if the data is not a DepositEvent', () => {
      const data = faker.string.hexadecimal({ length: 514 }) as `0x${string}`;
      const topics = [
        faker.string.hexadecimal({ length: 64 }) as `0x${string}`,
      ] as [signature: `0x${string}`, ...args: `0x${string}`[]];

      expect(kilnDecoder.decodeDepositEvent({ data, topics })).toBe(null);
    });
  });
});
