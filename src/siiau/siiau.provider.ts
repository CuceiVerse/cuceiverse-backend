import { SiiauSnapshotDto, SiiauSnapshotRequestDto } from './dto/siiau.dto';

export const SIIAU_PROVIDER = Symbol('SIIAU_PROVIDER');

export interface SiiauProvider {
  fetchSnapshot(input: SiiauSnapshotRequestDto): Promise<SiiauSnapshotDto>;
}
