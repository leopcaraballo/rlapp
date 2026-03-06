/**
 * ONE-SHOT EXAMPLE: NestJS Unit Test with Proper Mocking
 *
 * This demonstrates the expected testing patterns for this project.
 * Sub-agents should follow this structure for all spec files.
 */

import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { Model } from "mongoose";

// Replace with the actual service and schema being tested
// import { TurnosService } from './turnos.service';
// import { Appointment } from '../schemas/appointment.schema';

describe("ExampleService", () => {
  let service: any; // Replace with actual service type
  let model: Model<any>; // Replace with actual document type

  // Mock factory — creates a typed mock for Mongoose Model
  const mockModel = {
    find: jest.fn(),
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    create: jest.fn(),
    exec: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        // ExampleService, // Replace with actual service
        {
          provide: getModelToken("Appointment"), // Replace with actual schema name
          useValue: mockModel,
        },
      ],
    }).compile();

    // service = module.get<ExampleService>(ExampleService);
    // model = module.get<Model<AppointmentDocument>>(getModelToken('Appointment'));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findWaiting", () => {
    it('should return appointments with status "waiting" sorted by createdAt', async () => {
      const mockAppointments = [
        {
          _id: "1",
          idCard: 12345,
          fullName: "Test Patient",
          status: "waiting",
        },
      ];

      // Chain mock: find().sort().exec()
      mockModel.find.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(mockAppointments),
        }),
      });

      // const result = await service.findWaiting();
      // expect(result).toEqual(mockAppointments);
      // expect(mockModel.find).toHaveBeenCalledWith({ status: 'waiting' });
    });
  });

  // ⚕️ HUMAN CHECK - Critical business logic test
  // This test verifies race condition prevention in office assignment
  describe("assignOffice", () => {
    it("should use findOneAndUpdate with status guard to prevent double-assignment", async () => {
      const mockUpdated = {
        _id: "1",
        status: "in_progress",
        officeNumber: "3",
      };

      mockModel.findOneAndUpdate.mockResolvedValue(mockUpdated);

      // const result = await service.assignOffice('1', '3');
      // expect(mockModel.findOneAndUpdate).toHaveBeenCalledWith(
      //   { _id: '1', status: 'waiting' },
      //   expect.objectContaining({ $set: expect.objectContaining({ officeNumber: '3' }) }),
      //   { new: true },
      // );
    });

    it("should throw NotFoundException when appointment is already assigned", async () => {
      mockModel.findOneAndUpdate.mockResolvedValue(null);

      // await expect(service.assignOffice('1', '3')).rejects.toThrow(NotFoundException);
    });
  });
});
