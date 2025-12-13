import { Table, Column, Model, PrimaryKey, Default, DataType, ForeignKey } from 'sequelize-typescript';
import { InferAttributes, InferCreationAttributes } from 'sequelize';
import { Auth } from './auth.model';

@Table({ tableName: 'refresh_tokens', timestamps: true, underscored: true })
export class RefreshToken extends Model<InferAttributes<RefreshToken>, InferCreationAttributes<RefreshToken>> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ allowNull: false })
  declare token: string;

  @ForeignKey(() => Auth)
  @Column({ type: DataType.UUID, allowNull: false })
  declare auth_id: string;

  @Column({ type: DataType.DATE, allowNull: false })
  declare expires_at: Date;

  @Column({ type: DataType.UUID, allowNull: true })
  declare session_id: string | null;
}