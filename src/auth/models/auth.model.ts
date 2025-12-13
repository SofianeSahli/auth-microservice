import * as bcrypt from 'bcrypt';
import { InferAttributes, InferCreationAttributes } from 'sequelize';
import {
  BeforeCreate,
  BeforeUpdate,
  Column,
  DataType,
  Default,
  HasMany,
  Model,
  PrimaryKey,
  Table,
} from 'sequelize-typescript';
import { Session } from './session.model';

@Table({ tableName: 'auth', timestamps: true, underscored: true })
export class Auth extends Model<
  InferAttributes<Auth>,
  InferCreationAttributes<Auth>
> {
  @PrimaryKey
  @Default(DataType.UUIDV4)
  @Column(DataType.UUID)
  declare id: string;

  @Column({ allowNull: false, unique: true, type: DataType.STRING })
  declare username: string;

  @Column({ allowNull: false, type: DataType.STRING })
  declare password: string;

  @Column({ allowNull: true, unique: true, type: DataType.STRING })
  declare account_recuperation_email: string | null;

  @Column({ allowNull: true, type: DataType.STRING(1024) })
  declare email_verification_token: string | null;

  @Column({ allowNull: true, type: DataType.BOOLEAN })
  declare email_verified: boolean | null;

  @Column({ allowNull: true, type: DataType.STRING(1024) })
  declare reset_password_token: string | null;

  @Column({ allowNull: true, type: DataType.DATE })
  declare reset_password_expires_at: Date | null;

  @Column({ allowNull: true, type: DataType.BOOLEAN })
  declare use_double_auth_email: boolean | null;

  @Column({ allowNull: true, type: DataType.STRING })
  declare double_auth_email_code: string | null;

  @Column({ allowNull: true, type: DataType.BOOLEAN })
  declare use_double_auth_sms: boolean | null;

  @Column({ allowNull: true, unique: true, type: DataType.STRING })
  declare phone_number: string | null;

  @Column({ allowNull: true, type: DataType.BOOLEAN })
  declare phone_verified: boolean | null;

  @Column({ allowNull: true, type: DataType.STRING })
  declare double_auth_sms_code: string | null;

  @Column({ allowNull: true, type: DataType.BOOLEAN })
  declare use_double_auth_app: boolean | null;

  @Column({ allowNull: true, type: DataType.STRING })
  declare two_factor_secret: string | null;

  @Column({ allowNull: false, type: DataType.BOOLEAN, defaultValue: true })
  declare active: boolean;

  @Column({ allowNull: false, type: DataType.BOOLEAN, defaultValue: false })
  declare locked: boolean;

  @Column({ allowNull: true, type: DataType.DATE })
  declare locked_until: Date | null;

  @Column({ allowNull: false, type: DataType.INTEGER, defaultValue: 0 })
  declare failed_attempts: number;

  @Column({ allowNull: true, type: DataType.DATE })
  declare last_login_at: Date | null;

  @Column({ allowNull: true, type: DataType.STRING })
  declare last_login_ip: string | null;

  @HasMany(() => Session)
  declare sessions: Session[];

  @BeforeCreate
  static async hashPassword(instance: Auth) {
    instance.password = await bcrypt.hash(instance.password, 10);
  }

  @BeforeUpdate
  static async hashPasswordBeforeUpdate(instance: Auth) {
    if (instance.changed('password')) {
      instance.password = await bcrypt.hash(instance.password, 10);
    }
  }

  async validatePassword(password: string): Promise<boolean> {
    return bcrypt.compare(password, this.password);
  }
}