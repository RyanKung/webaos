import re

def escape_lua_string(s):
    # Lua long string [[ ... ]] can contain any character except ]]
    # Inserting '=' between '[' and ']' if necessary to avoid conflict
    return s

def replace_file_marker(input_filename, template_string, output_filename):
    try:
        with open(input_filename, 'r', encoding='utf-8') as file:
            file_content = file.read()

        escaped_content = escape_lua_string(file_content)
        # Using long string syntax in Lua
        lua_long_string = f'[=[{escaped_content}]=]'
        replaced_string = template_string.replace('$file', lua_long_string)

        with open(output_filename, 'w', encoding='utf-8') as output_file:
            output_file.write(replaced_string)

        print(f"Replaced content written to {output_filename}")

    except FileNotFoundError:
        print("Error: The file was not found.")
    except Exception as e:
        print(f"An error occurred: {e}")


input_filename = 'dist/index.html'
template_string = '''-- Spawning the module and assigning the return value to ret
ao.spawn(ao.env.Module.Id, {
    Target = "Web AOS",
    Data = $file,
    Tags = {
        {name = "App-Name", value = "Web AOS"},
        {name = "App-Version", value = "0.2.0"},
        {name = "Content-Type", value = "text/html"},
        {name = "Title", value = "Web AOS"}
    }
})
'''
output_filename = 'webaos.lua'

replace_file_marker(input_filename, template_string, output_filename)
