import {
  Table,
  Column,
  Model,
  PrimaryKey,
  Default,
  DataType,
  ForeignKey,
} from 'sequelize-typescript';
import { InferAttributes, InferCreationAttributes } from 'sequelize';
import { Auth } from './auth.model';

@Table({ tableName: 'sessions', timestamps: true, underscored: true })
export class Session extends Model<
  InferAttributes<Session>,
  InferCreationAttributes<Session>
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @ForeignKey(() => Auth)
  @Column({ type: DataType.UUID, allowNull: false })
  declare auth_id: string;

  @Column({ type: DataType.STRING, allowNull: false })
  declare device: string;

  @Column({ type: DataType.STRING, allowNull: true })
  declare ip: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare user_agent: string | null;

  @Column({ type: DataType.STRING, allowNull: true })
  declare location: string | null;

  @Column({ type: DataType.DATE, allowNull: false, defaultValue: DataType.NOW })
  declare logged_in_at: Date;

  @Column({ type: DataType.DATE, allowNull: true })
  declare logged_out_at: Date | null;

  @Column({ type: DataType.BOOLEAN, allowNull: false, defaultValue: true })
  declare active: boolean;

  @Column({ type: DataType.STRING, allowNull: true })
  declare refresh_token_id: string | null;

  @Column({ type: DataType.DATE, allowNull: true })
  declare last_activity_at: Date | null;
}