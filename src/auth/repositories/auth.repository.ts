import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Op } from 'sequelize';
import { Auth } from '../models/auth.model';

@Injectable()
export class AuthRepository {

  constructor(@InjectModel(Auth) private userModel: typeof Auth) { }

  async create(dto: { username: string; password: string }): Promise<Auth> {
    return this.userModel.create(dto as Auth);
  }

  async findByUsername(username: string): Promise<Auth | null> {
    return this.userModel.findOne({ where: { username } });
  }

  async findById(id: string): Promise<Auth | null> {
    return this.userModel.findByPk(id);
  }

  async updatePassword(userId: string, hashedPassword: string) {
    return this.userModel.update(
      { password: hashedPassword },
      { where: { id: userId } }
    );
  }
  async update(auth: Partial<Auth>) {
    const updateData = auth.get!({ plain: true });
    const { id, ...dataToUpdate } = updateData;

    if (!id) {
      throw new Error('User ID is required for update');
    }

    return this.userModel.update(
      dataToUpdate,
      { where: { id } }
    );
  }

  async findAuthByUsernameOrEmail(query: string) {
    return await this.userModel.findOne({
      where: {
        [Op.or]: [
          { username: query },
          { account_recuperation_email: query }
        ]
      }
    });
    // Note: This returns whichever is found first, not necessarily username first

  }


}