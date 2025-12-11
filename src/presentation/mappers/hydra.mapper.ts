import { Injectable } from '@nestjs/common';
import { HydraCollection, HydraMember } from '../dto/hydra.dto';
import { AccountDto } from '../dto/account.dto';

@Injectable()
export class HydraMapper {
  private readonly basePath = '/api/accounts';
  private readonly context = '/api/contexts/Account';

  toMember(account: AccountDto): HydraMember {
    return {
      '@context': this.context,
      '@id': `${this.basePath}/${account.id}`,
      '@type': 'Account',
      id: account.id,
      name: account.name,
      email: account.email,
      roles: account.roles || [],
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
      sources: account.sources || [],
    };
  }

  toCollection(
    items: AccountDto[],
    total: number,
    page: number,
    perPage: number,
  ): HydraCollection {
    const totalPages = Math.ceil(total / perPage);

    return {
      '@context': this.context,
      '@id': this.basePath,
      '@type': 'hydra:Collection',
      'hydra:member': items.map((item) => this.toMember(item)),
      'hydra:totalItems': total,
      'hydra:view': {
        '@id': `${this.basePath}?page=${page}`,
        type: 'hydra:PartialCollectionView',
        'hydra:first': `${this.basePath}?page=1`,
        'hydra:last': totalPages > 0 ? `${this.basePath}?page=${totalPages}` : null,
        'hydra:previous': page > 1 ? `${this.basePath}?page=${page - 1}` : null,
        'hydra:next': page < totalPages ? `${this.basePath}?page=${page + 1}` : null,
      },
    };
  }
}

