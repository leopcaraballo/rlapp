/**
 * ONE-SHOT EXAMPLE: NestJS Service Pattern
 *
 * This demonstrates the expected patterns for backend services
 * in this project. Sub-agents should follow this structure.
 */

import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import {
  Appointment,
  AppointmentDocument,
} from "../schemas/appointment.schema";

@Injectable()
export class ExampleService {
  private readonly logger = new Logger(ExampleService.name);

  constructor(
    @InjectModel(Appointment.name)
    private readonly appointmentModel: Model<AppointmentDocument>,
  ) {}

  /**
   * Find all appointments waiting for assignment.
   * // ⚕️ HUMAN CHECK - Query performance
   * This uses in-memory sorting. For large datasets, consider
   * adding a MongoDB index on { status: 1, createdAt: 1 }.
   */
  async findWaiting(): Promise<AppointmentDocument[]> {
    return this.appointmentModel
      .find({ status: "waiting" })
      .sort({ createdAt: 1 })
      .exec();
  }

  /**
   * Assign an office to an appointment.
   * // ⚕️ HUMAN CHECK - Race condition prevention
   * Uses findOneAndUpdate with a status guard to prevent
   * double-assignment when multiple scheduler ticks overlap.
   */
  async assignOffice(
    appointmentId: string,
    officeNumber: string,
  ): Promise<AppointmentDocument> {
    const updated = await this.appointmentModel.findOneAndUpdate(
      { _id: appointmentId, status: "waiting" }, // Guard: only if still waiting
      {
        $set: {
          officeNumber,
          status: "in_progress",
          startTime: new Date(),
        },
      },
      { new: true },
    );

    if (!updated) {
      this.logger.warn(
        `Appointment ${appointmentId} was already assigned or not found`,
      );
      throw new NotFoundException(
        `Appointment ${appointmentId} not available for assignment`,
      );
    }

    return updated;
  }
}
