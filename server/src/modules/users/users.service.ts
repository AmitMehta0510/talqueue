import prisma from "shared/database/prisma";
import { addReputation } from "../reputation/reputation.service";
import { createActivity } from "../activities/activity.service";
import { calculateEngineeringScore } from "../reputation/engineering-score.service";
import { calculateTrustLevel } from "modules/engineering/engineering-trust.service";


export const getMyProfile = async (
  userId: string
) => {
  return prisma.user.findUnique({
    where: {
      id: userId,
    },

    include: {
      username: true,
      profile: true,

      skills: {
        include: {
          skill: true,
        },
      },

      experiences: true,

      educations: {
        include: {
          college: true,
          department: true,
        },
      },

      roles: {
        include: {
          role: true,
        },
      },
    },
  });
};

export const updateProfile = async (
  userId: string,
  data: any
) => {
  return prisma.profile.update({
    where: {
      userId,
    },

    data,
  });
};

export const addSkill = async (
  userId: string,
  data: any
) => {
  return prisma.userSkill.create({
    data: {
      userId,
      skillId: data.skillId,
      level: data.level,
    },
  });
};

export const addExperience =  async (
    userId: string,
    data: any
  ) => {

    // Find company
    let company =
      await prisma.company.findUnique({
        where: {
          name: data.companyName,
        },
      });

    // Auto create company
    if (!company) {

      company =
        await prisma.company.create({
          data: {
            name:
              data.companyName,

            slug:
              data.companyName
                .toLowerCase()
                .replace(/\s+/g, "-"),
          },
        });
    }

    // Current experience handling
    if (data.isCurrent) {

      await prisma.experience.updateMany({
        where: {
          userId,
          isCurrent: true,
        },

        data: {
          isCurrent: false,
        },
      });
    }

    // Verification scoring
    let verificationScore = 0;

    // Work email
    if (data.workEmail) {
      verificationScore += 25;
    }

    // Manager email
    if (data.managerEmail) {
      verificationScore += 15;
    }

    // Documents
    if (
      data.documents &&
      Array.isArray(
        data.documents
      ) &&
      data.documents.length > 0
    ) {
      verificationScore += 25;
    }

    // Tech stack
    if (
      data.techStack &&
      Array.isArray(
        data.techStack
      )
    ) {
      verificationScore += 10;
    }

    // Skills used
    if (
      data.skillsUsed &&
      Array.isArray(
        data.skillsUsed
      )
    ) {
      verificationScore += 10;
    }

    // Duration check
    const endDate =
      data.endDate
        ? new Date(
            data.endDate
          )
        : new Date();

    const months =
      (
        (
          endDate.getTime() -
          new Date(
            data.startDate
          ).getTime()
        ) /
        (
          1000 *
          60 *
          60 *
          24 *
          30
        )
      );

    if (months >= 3) {
      verificationScore += 15;
    }

    // Verified threshold
    const verified =
      verificationScore >= 60;

    // Create experience
    const experience =
      await prisma.experience.create({
        data: {
          userId,

          companyId:
            company.id,

          companyName:
            company.name,

          title:
            data.title,

          employmentType:
            data.employmentType,

          startDate:
            new Date(
              data.startDate
            ),

          endDate:
            data.endDate
              ? new Date(
                  data.endDate
                )
              : null,

          isCurrent:
            data.isCurrent ||
            false,

          description:
            data.description,

          //
          // Authenticity
          //
          verified,

          verificationScore,

          verifiedAt:
            verified
              ? new Date()
              : null,

          workEmail:
            data.workEmail,

          managerName:
            data.managerName,

          managerEmail:
            data.managerEmail,

          managerLinkedinUrl:
            data.managerLinkedinUrl,

          documents:
            data.documents,

          skillsUsed:
            data.skillsUsed,

          achievements:
            data.achievements,

          techStack:
            data.techStack,

          teamSize:
            data.teamSize,
        },

        include: {
          company: true,
        },
      });

    // Reputation reward
    await addReputation(
      userId,

      "EXPERIENCE_ADDED",

      verified ? 20 : 5,

      verified
        ? "Added verified experience"
        : "Added experience",

      {
        experienceId:
          experience.id,
      }
    );

    // Activity
    await createActivity(
      userId,

      "EXPERIENCE_ADDED",

      "Added experience",

      `Added experience at "${company.name}"`,

      {
        experienceId:
          experience.id,
      }
    );

    // Recalculate engineering score
    await calculateEngineeringScore(
      userId
    );

    return experience;
  };

export const addEducation = async (
  userId: string,
  data: any
) => {
  return prisma.education.create({
    data: {
      userId,

      collegeId: data.collegeId,
      departmentId: data.departmentId,

      degree: data.degree,
      fieldOfStudy: data.fieldOfStudy,

      startYear: data.startYear,
      endYear: data.endYear,

      current: data.current || false,
    },
  });
};