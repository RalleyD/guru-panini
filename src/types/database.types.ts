export type Json =
	| string
	| number
	| boolean
	| null
	| { [key: string]: Json | undefined }
	| Json[];

export type Database = {
	graphql_public: {
		Tables: {
			[_ in never]: never;
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			graphql: {
				Args: {
					extensions?: Json;
					operationName?: string;
					query?: string;
					variables?: Json;
				};
				Returns: Json;
			};
		};
		Enums: {
			[_ in never]: never;
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
	public: {
		Tables: {
			allocations: {
				Row: {
					created_at: string;
					end_date: string;
					id: string;
					is_proposed: boolean;
					owner_id: string;
					project_id: string;
					role: Database["public"]["Enums"]["allocation_role"];
					start_date: string;
					translator_id: string;
				};
				ComputedFields: never;
				Insert: {
					created_at?: string;
					end_date: string;
					id?: string;
					is_proposed?: boolean;
					owner_id?: string;
					project_id: string;
					role: Database["public"]["Enums"]["allocation_role"];
					start_date: string;
					translator_id: string;
				};
				Update: {
					created_at?: string;
					end_date?: string;
					id?: string;
					is_proposed?: boolean;
					owner_id?: string;
					project_id?: string;
					role?: Database["public"]["Enums"]["allocation_role"];
					start_date?: string;
					translator_id?: string;
				};
				Relationships: [
					{
						foreignKeyName: "allocations_project_id_fkey";
						columns: ["project_id", "owner_id"];
						isOneToOne: false;
						referencedRelation: "projects";
						referencedColumns: ["id", "owner_id"];
					},
					{
						foreignKeyName: "allocations_translator_id_fkey";
						columns: ["translator_id", "owner_id"];
						isOneToOne: false;
						referencedRelation: "translators";
						referencedColumns: ["id", "owner_id"];
					},
				];
			};
			clients: {
				Row: {
					archived_at: string | null;
					contact_email: string;
					contact_name: string;
					created_at: string;
					has_glossary: boolean;
					id: string;
					name: string;
					notes: string | null;
					owner_id: string;
					usual_source_language: string | null;
					usual_target_language: string | null;
					usual_work_type:
						| Database["public"]["Enums"]["client_work_type"]
						| null;
					writing_preferences: string | null;
				};
				ComputedFields: never;
				Insert: {
					archived_at?: string | null;
					contact_email: string;
					contact_name: string;
					created_at?: string;
					has_glossary?: boolean;
					id?: string;
					name: string;
					notes?: string | null;
					owner_id?: string;
					usual_source_language?: string | null;
					usual_target_language?: string | null;
					usual_work_type?:
						| Database["public"]["Enums"]["client_work_type"]
						| null;
					writing_preferences?: string | null;
				};
				Update: {
					archived_at?: string | null;
					contact_email?: string;
					contact_name?: string;
					created_at?: string;
					has_glossary?: boolean;
					id?: string;
					name?: string;
					notes?: string | null;
					owner_id?: string;
					usual_source_language?: string | null;
					usual_target_language?: string | null;
					usual_work_type?:
						| Database["public"]["Enums"]["client_work_type"]
						| null;
					writing_preferences?: string | null;
				};
				Relationships: [];
			};
			feedback_entries: {
				Row: {
					body: string;
					created_at: string;
					id: string;
					owner_id: string;
					person: string | null;
					project_id: string;
					source: Database["public"]["Enums"]["feedback_source"];
					status: Database["public"]["Enums"]["feedback_status"];
					tag: string | null;
					version: string | null;
				};
				ComputedFields: never;
				Insert: {
					body: string;
					created_at?: string;
					id?: string;
					owner_id?: string;
					person?: string | null;
					project_id: string;
					source: Database["public"]["Enums"]["feedback_source"];
					status?: Database["public"]["Enums"]["feedback_status"];
					tag?: string | null;
					version?: string | null;
				};
				Update: {
					body?: string;
					created_at?: string;
					id?: string;
					owner_id?: string;
					person?: string | null;
					project_id?: string;
					source?: Database["public"]["Enums"]["feedback_source"];
					status?: Database["public"]["Enums"]["feedback_status"];
					tag?: string | null;
					version?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "feedback_entries_project_id_fkey";
						columns: ["project_id", "owner_id"];
						isOneToOne: false;
						referencedRelation: "projects";
						referencedColumns: ["id", "owner_id"];
					},
				];
			};
			follow_ups: {
				Row: {
					body: string;
					created_at: string;
					done_at: string | null;
					id: string;
					opened_at: string | null;
					owner_id: string;
					project_id: string;
					reason: Database["public"]["Enums"]["follow_up_reason"];
					state: Database["public"]["Enums"]["follow_up_state"];
					subject: string;
				};
				ComputedFields: never;
				Insert: {
					body: string;
					created_at?: string;
					done_at?: string | null;
					id?: string;
					opened_at?: string | null;
					owner_id?: string;
					project_id: string;
					reason: Database["public"]["Enums"]["follow_up_reason"];
					state?: Database["public"]["Enums"]["follow_up_state"];
					subject: string;
				};
				Update: {
					body?: string;
					created_at?: string;
					done_at?: string | null;
					id?: string;
					opened_at?: string | null;
					owner_id?: string;
					project_id?: string;
					reason?: Database["public"]["Enums"]["follow_up_reason"];
					state?: Database["public"]["Enums"]["follow_up_state"];
					subject?: string;
				};
				Relationships: [
					{
						foreignKeyName: "follow_ups_project_id_fkey";
						columns: ["project_id", "owner_id"];
						isOneToOne: false;
						referencedRelation: "projects";
						referencedColumns: ["id", "owner_id"];
					},
				];
			};
			project_steps: {
				Row: {
					completed_at: string | null;
					created_at: string;
					due_date: string | null;
					id: string;
					milestone: Database["public"]["Enums"]["project_milestone"] | null;
					owner_id: string;
					project_id: string;
					title: string | null;
				};
				ComputedFields: never;
				Insert: {
					completed_at?: string | null;
					created_at?: string;
					due_date?: string | null;
					id?: string;
					milestone?: Database["public"]["Enums"]["project_milestone"] | null;
					owner_id?: string;
					project_id: string;
					title?: string | null;
				};
				Update: {
					completed_at?: string | null;
					created_at?: string;
					due_date?: string | null;
					id?: string;
					milestone?: Database["public"]["Enums"]["project_milestone"] | null;
					owner_id?: string;
					project_id?: string;
					title?: string | null;
				};
				Relationships: [
					{
						foreignKeyName: "project_steps_project_id_owner_id_fkey";
						columns: ["project_id", "owner_id"];
						isOneToOne: false;
						referencedRelation: "projects";
						referencedColumns: ["id", "owner_id"];
					},
				];
			};
			projects: {
				Row: {
					archived_at: string | null;
					client_id: string;
					created_at: string;
					document_type: Database["public"]["Enums"]["document_type"];
					due_date: string;
					id: string;
					notes: string | null;
					owner_id: string;
					source_file_name: string | null;
					source_file_path: string | null;
					source_language: string;
					target_language: string;
					title: string;
					word_count: number | null;
				};
				ComputedFields: never;
				Insert: {
					archived_at?: string | null;
					client_id: string;
					created_at?: string;
					document_type: Database["public"]["Enums"]["document_type"];
					due_date: string;
					id?: string;
					notes?: string | null;
					owner_id?: string;
					source_file_name?: string | null;
					source_file_path?: string | null;
					source_language: string;
					target_language: string;
					title: string;
					word_count?: number | null;
				};
				Update: {
					archived_at?: string | null;
					client_id?: string;
					created_at?: string;
					document_type?: Database["public"]["Enums"]["document_type"];
					due_date?: string;
					id?: string;
					notes?: string | null;
					owner_id?: string;
					source_file_name?: string | null;
					source_file_path?: string | null;
					source_language?: string;
					target_language?: string;
					title?: string;
					word_count?: number | null;
				};
				Relationships: [
					{
						foreignKeyName: "projects_client_id_fkey";
						columns: ["client_id", "owner_id"];
						isOneToOne: false;
						referencedRelation: "clients";
						referencedColumns: ["id", "owner_id"];
					},
				];
			};
			settings: {
				Row: {
					agency_name: string | null;
					created_at: string;
					email_provider: Database["public"]["Enums"]["email_provider"];
					follow_up_after_days: number;
					owner_id: string;
					owner_name: string | null;
					photo_path: string | null;
					reminder_draft_waiting: string | null;
					reminder_question_waiting: string | null;
					reminder_quote_not_accepted: string | null;
					sign_off: string | null;
				};
				ComputedFields: never;
				Insert: {
					agency_name?: string | null;
					created_at?: string;
					email_provider?: Database["public"]["Enums"]["email_provider"];
					follow_up_after_days?: number;
					owner_id?: string;
					owner_name?: string | null;
					photo_path?: string | null;
					reminder_draft_waiting?: string | null;
					reminder_question_waiting?: string | null;
					reminder_quote_not_accepted?: string | null;
					sign_off?: string | null;
				};
				Update: {
					agency_name?: string | null;
					created_at?: string;
					email_provider?: Database["public"]["Enums"]["email_provider"];
					follow_up_after_days?: number;
					owner_id?: string;
					owner_name?: string | null;
					photo_path?: string | null;
					reminder_draft_waiting?: string | null;
					reminder_question_waiting?: string | null;
					reminder_quote_not_accepted?: string | null;
					sign_off?: string | null;
				};
				Relationships: [];
			};
			translators: {
				Row: {
					archived_at: string | null;
					availability: string | null;
					created_at: string;
					email: string;
					id: string;
					language_pairs: string[];
					name: string;
					owner_id: string;
					specialisms: string[];
				};
				ComputedFields: never;
				Insert: {
					archived_at?: string | null;
					availability?: string | null;
					created_at?: string;
					email: string;
					id?: string;
					language_pairs?: string[];
					name: string;
					owner_id?: string;
					specialisms?: string[];
				};
				Update: {
					archived_at?: string | null;
					availability?: string | null;
					created_at?: string;
					email?: string;
					id?: string;
					language_pairs?: string[];
					name?: string;
					owner_id?: string;
					specialisms?: string[];
				};
				Relationships: [];
			};
		};
		Views: {
			[_ in never]: never;
		};
		Functions: {
			create_project: {
				Args: {
					client_id: string;
					document_type: Database["public"]["Enums"]["document_type"];
					due_date: string;
					source_file_name?: string;
					source_file_path?: string;
					source_language: string;
					target_language: string;
					title: string;
					translator_id?: string;
					word_count?: number;
				};
				Returns: string;
			};
		};
		Enums: {
			allocation_role: "translator" | "reviewer";
			client_work_type:
				| "legal"
				| "real_estate"
				| "technical"
				| "business"
				| "mixed";
			document_type:
				| "legal"
				| "real_estate"
				| "technical"
				| "business"
				| "other";
			email_provider: "default_app" | "gmail" | "outlook";
			feedback_source: "reviewer" | "client";
			feedback_status: "open" | "applied";
			follow_up_reason:
				| "draft_waiting"
				| "quote_not_accepted"
				| "question_waiting";
			follow_up_state: "ready" | "opened" | "done";
			project_milestone: "draft" | "review" | "client_feedback" | "delivery";
		};
		CompositeTypes: {
			[_ in never]: never;
		};
	};
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
	keyof Database,
	"public"
>];

export type Tables<
	DefaultSchemaTableNameOrOptions extends
		| keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
				DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
			DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
			Row: infer R;
		}
		? R
		: never
	: DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
				DefaultSchema["Views"])
		? (DefaultSchema["Tables"] &
				DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
				Row: infer R;
			}
			? R
			: never
		: never;

export type TablesInsert<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Insert: infer I;
		}
		? I
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Insert: infer I;
			}
			? I
			: never
		: never;

export type TablesUpdate<
	DefaultSchemaTableNameOrOptions extends
		| keyof DefaultSchema["Tables"]
		| { schema: keyof DatabaseWithoutInternals },
	TableName extends DefaultSchemaTableNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
		: never = never,
> = DefaultSchemaTableNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
			Update: infer U;
		}
		? U
		: never
	: DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
		? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
				Update: infer U;
			}
			? U
			: never
		: never;

export type Enums<
	DefaultSchemaEnumNameOrOptions extends
		| keyof DefaultSchema["Enums"]
		| { schema: keyof DatabaseWithoutInternals },
	EnumName extends DefaultSchemaEnumNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
		: never = never,
> = DefaultSchemaEnumNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
	: DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
		? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
		: never;

export type CompositeTypes<
	PublicCompositeTypeNameOrOptions extends
		| keyof DefaultSchema["CompositeTypes"]
		| { schema: keyof DatabaseWithoutInternals },
	CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
		schema: keyof DatabaseWithoutInternals;
	}
		? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
		: never = never,
> = PublicCompositeTypeNameOrOptions extends {
	schema: keyof DatabaseWithoutInternals;
}
	? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
	: PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
		? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
		: never;

export const Constants = {
	graphql_public: {
		Enums: {},
	},
	public: {
		Enums: {
			allocation_role: ["translator", "reviewer"],
			client_work_type: [
				"legal",
				"real_estate",
				"technical",
				"business",
				"mixed",
			],
			document_type: ["legal", "real_estate", "technical", "business", "other"],
			email_provider: ["default_app", "gmail", "outlook"],
			feedback_source: ["reviewer", "client"],
			feedback_status: ["open", "applied"],
			follow_up_reason: [
				"draft_waiting",
				"quote_not_accepted",
				"question_waiting",
			],
			follow_up_state: ["ready", "opened", "done"],
			project_milestone: ["draft", "review", "client_feedback", "delivery"],
		},
	},
} as const;
