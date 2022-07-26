import { Student } from "./Student";

export type Call = {
  id: number;
  date: Date;
  duration: number;
  recordingUrl: string | null;
  student?: Student;
  coach?: Coach;
};
