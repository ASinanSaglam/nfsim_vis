// this is needed when running from npm
// import { SVG } from '@svgdotjs/svg.js'

// Begin: Actor classes
export class Actor {
  constructor(name, parent) {
    this.name = name;
    this.parent = parent;
    this.system = null;
    this.id = null;
    this.x = 0;
    this.y = 0;
  }
  set_parent(parent) {
    this.parent = parent;
  }
  set_system(system) {
    this.system = system;
  }
  render() {
    Error("Not implemented for template class");
  }
}

export class MoleculeType {
  constructor(mtype_dict, events_bool) {
    this.dict = mtype_dict;
    this.events = events_bool;
    this.initialize();
  }
  initialize() {
    // we can either have molecule types from events
    // or from the model itself if events are missing
    if (this.events) {
      // events file given
    } else {
      // no events file given, using model
    }
  }
  instantiate_molecule() {
    // this will be used to instantiate a single
    // instance of the molecule
    return
  }
}

export class Molecule extends Actor {
  constructor(name, parent, components, symbol) {
    super(name, parent);
    this.components = components;
    this.symbol = symbol;
    this.group = null;
    this.animator = null;
    this.typeID = null;
    this.component_by_id = {};
    this.current_component = 0;
    this.bonds = {};
  }
  add_bond(cid, target_tuple, target_component) {
    this.bonds[target_tuple] = target_component;
    this.component_by_id[cid].add_bond(target_tuple, target_component);
  }
  remove_bond(cid, target_tuple) {
    if (target_tuple in this.bonds) {
      delete this.bonds[target_tuple];
      this.component_by_id[cid].remove_bond(target_tuple);
      return true;
    } else {
      console.log("can't find key: ", target_tuple, " in bonds!");
      return false
    }
  }
  add_component(name, component) {
    // component.set_system(this.system);
    // there's something weird about how systems are set
    component.id = this.current_component;
    this.components[name] = component;
    this.component_by_id[this.current_component] = component;
    this.current_component += 1;
  }
  render() {
    if (this.group == null) {
      // this.group = this.system.canvas.group();
      this.group = this.system.canvas.nested();
    }
    // render molecule
    this.group.use(this.symbol);
    // render components
    for (let i = 0; i < Object.keys(this.components).length; i++) {
      this.components[Object.keys(this.components)[i]].render();
    }
    // setup the runner for the group here as well
    this.group.timeline(this.system.timeline);
    return this.group;
  }
  transform(transform_dict) {
    this.group.transform(transform_dict);
  }
  // detail printing for debug purposes
  print_details() {
    console.log(`Molecule name: ${this.name}`);
    console.log(`Molecule rep: ${this.symbol}`);
    for (let i = 0; i < Object.keys(this.components).length; i++) {
      this.components[Object.keys(this.components)[i]].print_details();
    }
  }
  sync_svg_location() {
    this.x = this.group.x();
    this.y = this.group.y();
    for (let i = 0; i < Object.keys(this.components).length; i++) {
      this.components[Object.keys(this.components)[i]].sync_svg_location();
    }
  }
}

export class Component extends Actor {
  constructor(name, parent, states, current_state, pos) {
    super(name, parent);
    this.states = states;
    this.current_state = current_state;
    this.curr_state_id = null;
    this.prev_state_id = null;
    this.current_render;
    this.pos = pos;
    this.bonds = {};
  }
  add_bond(target_tuple, target_component) {
    this.bonds[target_tuple] = target_component;
  }
  remove_bond(target_tuple) {
    if (target_tuple in this.bonds) {
      delete this.bonds[target_tuple];
      return true;
    } else {
      console.log("can't find key: ", target_tuple, " in bonds!");
      return false
    }
  }
  add_state(state) {
    state.set_system(this.system);
    if (state.id != null) {
      this.states[state.id] = state;
    } else {
      this.states.push(state);
    }
    state.set_parent(this);
  }
  set_state(state) {
    this.prev_state_id = this.curr_state_id;
    this.curr_state_id = state.id;
    this.current_state = state;
  }
  get_state_by_id(state_id) {
    return this.states[state_id];
  }
  set_state_by_id(state_id) {
    this.prev_state_id = this.curr_state_id;
    this.curr_state_id = state_id;
    this.current_state = this.states[state_id];
  }
  next_state () {
    this.prev_state_id = this.curr_state_id;
    let next_id = (this.curr_state_id+1)%this.states.length;
    this.curr_state_id = next_id;
    this.current_state = this.states[this.curr_state_id];
  }
  render() {
    // render component states
    for (let i = 0;i<this.states.length;i++) { 
      if (i==this.current_state.id) {
        let render_inst = this.current_state.render(true);
        this.current_render = render_inst;
        render_inst.transform({
          translateX: this.pos[0],
          translateY: this.pos[1],
        });
      } else {
        let render_inst = this.states[i].render(false);
        render_inst.transform({
          translateX: this.pos[0],
          translateY: this.pos[1],
        });
      }
    } 
    
    return this.current_render;
  }
  // detail printing for debug purposes
  print_details() {
    console.log(`  Component name: ${this.name}`);
    console.log(`  Component state: ${this.current_state.name}`);
    console.log(`  Component pos: ${this.pos}`);
    for (let i = 0; i < Object.keys(this.states).length; i++) {
      this.states[Object.keys(this.states)[i]].print_details();
    }
  }
  sync_svg_location() {
    this.x = this.parent.group.x() + this.pos[0];
    this.y = this.parent.group.y() + this.pos[1];
  }
}

export class ComponentState extends Actor {
  constructor(name, parent, symbol) {
    super(name, parent);
    this.symbol = symbol;
    this.render;
  }
  set_symbol(symbol) {
    this.symbol = symbol;
  }
  set_id(state_id) {
    this.id = state_id;
  }
  render(visible) {
    // render state
    let render_inst = this.parent.parent.group.use(this.symbol);
    if (!visible) { 
      render_inst.opacity(0.0);

      // in mol_viewer, click event listeners on current_render are
      // blocked by invisible renders that are in front of current_render
      render_inst.back();
      render_inst.forward(); // keep molecule as the very first render
    }
    render_inst.timeline(this.system.timeline); // for animations scheduled on state render directly
    this.render = render_inst;
    // transform as needed
    return render_inst;
  }
  // detail printing for debug purposes
  print_details() {
    console.log(`    State name: ${this.name}`);
    console.log(`    State rep: ${this.symbol}`);
  }
}
// End: Actor classes

// Begin: Rules and related classes
export class Rule {
  constructor(name, reactants, products, rate_law, operations) {
    this.name = name;
    this.reactants = reactants;
    this.products = products;
    this.rate_law = rate_law;
    this.operations = operations;
  }
}

export class Bonds {
  constructor(bonds_dict) {
    this.dict = bonds_dict;
    this.bonds = {}
    this._parse_dict();
  }
  get_bond_id(comp) {
    let num_bonds = comp['@numberOfBonds'];
    let comp_id = comp['@id'];
    try {
      let num_bonds = parseInt(num_bonds);
    } catch (error) {
      // if we can't convert, it means we have 
      // something like + or ?, just return
      return num_bonds;
    }
    let bond_id = this.bonds[comp_id];
    return bond_id;
  }
  get_arr_from_id(id_str) {
    return id_str.split("_");
  }
  arrs_from_bond(bond) {
    let s1 = bond['@site1'];
    let s2 = bond['@site2'];
    return [s1,s2];
  }
  _parse_dict() {
    if (Array.isArray(this.dict)) {
      let j = 0;
      for (let i = 0;i<this.dict.length;i++) {
        let bond_arrs = this.arrs_from_bond(this.dict[i])
        let bond_part_1 = bond_arrs[0];
        let bond_part_2 = bond_arrs[1];
        // deal with bond partner 1
        if (bond_part_1 in this.bonds) {
          this.bonds[bond_part_1].push(j+1);
        } else {
          this.bonds[bond_part_1] = [j+1];
        }
        // deal with bond partner 2
        if (bond_part_2 in this.bonds) {
          this.bonds[bond_part_2].push(j+1);
        } else {
          this.bonds[bond_part_2] = [j+1];
        }
        // deal with counter
        j++;
      }
    } else {
      let bond_arrs = this.arrs_from_bond(this.dict)
      let bond_part_1 = bond_arrs[0];
      let bond_part_2 = bond_arrs[1];
      this.bonds[bond_part_1] = [1];
      this.bonds[bond_part_2] = [1];
    }
  }
}

export class MoleculePattern {
  constructor(molec_dict) {
    this.dict = molec_dict;
    this.name = null;
    this.label = null;
    this.compartment = null;
    this.components = [];
  }
}

export class ComponentPattern {
  constructor(comp_dict) {
    this.dict = comp_dict;
    this.name = null;
    this.label = null;
    this.state = null;
    this.bonds = [];
  }
}

export class Pattern {
  constructor(pat_dict) {
    this.dict = pat_dict;
    this._bonds = null;
    this.compartment = null;
    this.label = null;
    this.fixed = false;
    this.matchOnce = false;
    this.relation = null;
    this.quantity = null;
    this.molecules = []
    this._parse_xml(this.dict);
  }
  _parse_xml() {
    // First get bonds of the pattern
    if ("ListOfBonds" in this.dict) {
      this._bonds = new Bonds(this.dict['ListOfBonds']['Bond'])
    }
    // Now we get various parameters that apply to the whole
    // pattern and not just individual molecules
    if ("@compartment" in this.dict) {
      this.compartment = this.dict['@compartment']
    }
    if ("@label" in this.dict) {
      this.label = this.dict['@label']
    }
    if ("@Fixed" in this.dict) {
      if (this.dict['@Fixed'] == 1) {
        this.fixed = true;
      }
    }
    if ("@matchOnce" in this.dict) {
      if (this.dict['@matchOnce'] == 1) {
        this.matchOnce = true;
      }
    }
    if (("@relation" in this.dict)&&("@quantity" in this.dict)) {
      this.relation = this.dict["@relation"];
      this.quantity = this.dict["@quantity"];
    }
    // Now we parse molecules
    let mols = this.dict['ListOfMolecules']['Molecule'];
    if (Array.isArray(mols)) {
      for (let i = 0;i<mols.length;i++) {
        this.molecules.push(this._parse_mol(mols[i]));
      }
    } else {
      this.molecules.push(this._parse_mol(mols));
    }
  }
  _parse_mol(mol_dict) {
    let molec = new MoleculePattern(mol_dict);
    if ("@name" in mol_dict) {
      molec.name = mol_dict['@name'];
    }
    if ("@label" in mol_dict) {
      molec.label = mol_dict['@label'];
    }
    if ("@compartment" in mol_dict) {
      molec.compartment = mol_dict['@compartment'];
    }
    if ("ListOfComponents" in mol_dict) {
      molec.components = this._parse_comp(mol_dict['ListOfComponents']['Component']);
    }
    return molec;
  }
  _parse_comp(comp_dict) {
    let comp_list = [];
    if (Array.isArray(comp_dict)) {
      for (let i = 0;i<comp_dict.length;i++) {
        let comp = new ComponentPattern();
        comp.dict = comp_dict[i];
        if ("@name" in comp_dict[i]) {
          comp.name = comp_dict[i]['@name']
        }
        if ("@label" in comp_dict[i]) {
          comp.name = comp_dict[i]['@name']
        }
        if ("@state" in comp_dict[i]) {
          comp.name = comp_dict[i]['@name']
        }
        if (comp_dict[i]['@numberOfBonds']!="0") {
          let bond_id = this._bonds.get_bond_id(comp_dict[i])
          for (let i = 0;i<bond_id.length;i++) {
            comp.bonds.push(bond_id[i])
          }
        }
        comp_list.push(comp);
      }
    } else {
      let comp = new ComponentPattern();
      if ("@name" in comp_dict) {
        comp.name = comp_dict['@name']
      }
      if ("@label" in comp_dict) {
        comp.name = comp_dict['@name']
      }
      if ("@state" in comp_dict) {
        comp.name = comp_dict['@name']
      }
      if (comp_dict['@numberOfBonds']!="0") {
        let bond_id = this._bonds.get_bond_id(comp_dict)
        for (let i = 0;i<bond_id.length;i++) {
          comp.bonds.push(bond_id[i])
        }
      }
      comp_list.push(comp);
    }
    return comp_list;
  }
}

export class RxnSide {
  constructor(dict) {
    this.dict = dict;
    this.patterns = [];
    // check if multiple patterns
    if(Array.isArray(this.dict)) {
      for(let i = 0;i<dict.length;i++) {
        let pat_dict = dict[i];
        let pattern = new Pattern(pat_dict);
        this.patterns.push(pattern);
      }
    } else {
      let pattern = new Pattern(this.dict);
      this.patterns.push(pattern);
    }
  }
}

export class Reactants extends RxnSide {
  constructor(dict) {
    super(dict);
    this.side_type = "reactants"
  }
}

export class Products extends RxnSide {
  constructor(dict) {
    super(dict);
    this.side_type = "products"
  }
}

export class Operation {
  constructor(type, args, sys) {
    this.sys = sys;
    this.type = type;
    this.args = args;
    this.mol_1_index = null;
    this.comp_1_index = null;
    this.comp_state_index = null;
    this.mol_2_index = null;
    this.comp_2_index = null;

    switch(this.type) {
      case "AddBond":
      case "DeleteBond":
        this.mol_1_index = this.args[0];
        this.comp_1_index = this.args[1];
        this.mol_2_index = this.args[2];
        this.comp_2_index = this.args[3];
        break;
      
      case "StateChange":
        this.mol_1_index = this.args[0];
        this.comp_1_index = this.args[1];
        this.comp_state_index = this.args[2];
        break;
      
      default:
        break;
    }
  }
  apply(state_dict) {
    switch(this.type) {
      case "AddBond":
        state_dict[this.mol_1_index].add_bond(this.comp_1_index, [this.mol_2_index,this.comp_2_index], state_dict[this.mol_2_index].component_by_id[this.comp_2_index]);
        state_dict[this.mol_2_index].add_bond(this.comp_2_index, [this.mol_1_index,this.comp_1_index], state_dict[this.mol_1_index].component_by_id[this.comp_1_index]);
        break;
      case "DeleteBond":
        state_dict[this.mol_1_index].remove_bond(this.comp_1_index, [this.mol_2_index,this.comp_2_index]);
        state_dict[this.mol_2_index].remove_bond(this.comp_2_index, [this.mol_1_index,this.comp_1_index]);
        break;
      case "StateChange":
        state_dict[this.mol_1_index].component_by_id[this.comp_1_index].set_state_by_id(this.comp_state_index);
        break;
      case "Add":
        let add_id = this.args[0];
        let add_type_id = this.args[1];
        let add_molec = this.sys.add_actor_from_name(this.sys.typeid_to_name[add_type_id]);
        state_dict[add_id] = add_molec;
        break;
      case "Delete":
        let del_id = this.args[0];
        delete state_dict[del_id];
        break;
      case "ChangeCompartment":
        console.log("operation type: ", this.type, " is not implemented!");
        break;
      case "IncrementState":
        console.log("operation type: ", this.type, " is not implemented!");
        break;
      case "DecrementState":
        console.log("operation type: ", this.type, " is not implemented!");
        break;
      case "DecrementPopulation":
        console.log("operation type: ", this.type, " is not implemented!");
        break;
    }
  }
}

export class Operations {
  constructor(dict, sys) {
    this.sys = sys;
    // 
    this.dict = dict;
    // read the operation
    this.operations = [];
    // List all possible operations & arguments
    this.ops_types = [
      "AddBond",
      "DeleteBond",
      "ChangeCompartment",
      "StateChange",
      "Add",
      "Delete",
    ];
    this.op_args = [
      "@site1",
      "@site2",
      "@id",
      "@source",
      "@destination",
      "@flipOrientation",
      "@moveConnected",
      "@site",
      "@finalState",
      "@DeleteMolecules",
    ];
    // Loop through valid arguments and record
    for (let i = 0;i<this.ops_types.length;i++) {
      if (this.ops_types[i] in dict) {
        // we got an operation, lets get args
        let args = {};
        for (let j = 0;j<this.op_args.length;j++) {
          if (this.op_args[j] in dict[this.ops_types[i]]) {
            args[this.op_args[j]] = dict[this.ops_types[i]][this.op_args[j]];
          }
        }
        let correct_op = new Operation(this.ops_types[i], args, this.sys);
        this.operations.push(correct_op);
      }
    }
  }
}

export class RateLaw {
  constructor(id, dict) {
    this.id = id;
    this.dict = dict;
    this.type = dict['@type'];
    let rate_cts;
    if (this.type == "Ele") {
      rate_cts = dict["ListOfRateConstants"]["RateConstant"]["@value"];
    } else if (this.type == "Function") {
      rate_cts = dict["@name"];
    } else if ((this.type =="MM") || (this.type =="Sat") || (this.type =="Hill") || (this.type =="Arrhenius")) {
      rate_cts = `${this.type}(`
      let args = dict["ListOfRateConstants"]["RateConstant"];
      if (Array.isArray(args)) {
        for (let i = 0;i<args.length;i++) { 
          if (i>0) {
            rate_cts += ",";
          }
          rate_cts += args[i]['@value'];
        }
      } else {
        rate_cts += args['@value'];
      }
      rate_cts += ")";
    } else {
      Error(`Rate law type ${this.type} is not recognized!`);
    }
    this.rate_cts = rate_cts;
  }
}
// End: Rules

// Main system class
export class System {
  constructor(canvas, actors, svgs, timeline, event_file) {
    this.canvas = canvas;
    this.actors = actors;
    this.actor_definitions = {};
    this.timeline = timeline;
    this.svgs = svgs;
    this.symbols = {};
    this.instances = [];
    this.rules = {};
    this.event_file = event_file;
    this.full_state = null;
    this.typeid_to_name = {}
  }
  async initialize(settings) {
    if (typeof this.event_file !== 'undefined') {
      // events file stuff
      await this.parse_event_file();
      await this.get_initial_state_array();
    }
    // we need to load in the SVG strings first
    await this.load_svgs(settings["svgs"]);
    // we now make symbols from each for re-use
    await this.define_symbols();
    // adding actors and associate them with symbols
    await this.add_actor_definitions(settings);
    // get rules
    await this.add_rules(settings);
    // add molecules from initial vector
    await this.get_init_state();
  }
  async get_init_state() {
    this.full_state = {};
    let molec;
    for (let i = 0;i<this.initial_molecule_array.length;i++) { 
      if (this.initial_molecule_array[i]>=0) {
        molec = this.add_actor_from_name(this.typeid_to_name[this.initial_molecule_array[i]]);
        this.full_state[i] = molec;
      }
    }
    // now that we have the state, we apply
    // all the operations to get the true initial state
    for (let i = 0;i<this.init_ops.length;i++) {
      this.init_ops[i].apply(this.full_state);
    }
  }
  async parse_event_file() {
    // fetch settings JSON
    let event_json = await fetch(this.event_file).then((event) =>
      event.json()
    );
    // store simulation info
    this.sim_info = event_json['simulation']['info'];
    // setup molecule types
    this.nf_molecule_types = await this.get_nf_molecule_types(event_json['simulation']['molecule_types']);
    // get the initial state map
    this.initial_state_dict = event_json['simulation']['initialState'];
    // store events
    this.events = event_json['simulation']['firings'];
    // inform that events are initialized
    console.log("--Events intialized--");
  }
  async get_nf_molecule_types(mtype_json) {
    let nf_mtypes = {};
    for (let i = 0;i<mtype_json.length;i++) {
      nf_mtypes[mtype_json[i]['name']] = mtype_json[i];
    }
    return nf_mtypes;
  }
  async get_initial_state_array() {
    // we use the finalized molecule types to initialize 
    // the model state fully
    // we should have initial state dictionary saved
    // under attribute this.initial_state_dict
    let molecule_array = this.initial_state_dict['molecule_array'];
    let ops = this.initial_state_dict['ops'];
    // molecule array is a compressed array of full set of
    // initial molecules
    let type_id,count;
    this.initial_molecule_array = [];
    for (let i = 0; i < molecule_array.length; i++) {
      // each element is an array of two elements
      type_id = molecule_array[i][0];
      count = molecule_array[i][1];
      // we need to add "count" of "type_id" molecules
      // to our initial molecule array
      for (let j = 0; j<count; j++) {
        this.initial_molecule_array.push(type_id);
      }
    }
    // ops is the full list of operations that needs to be applied
    // to the initial set of molecules to get the actual initial 
    // state
    this.init_ops = []
    for (let i = 0; i < ops.length; i++) {
      this.init_ops.push(new Operation(ops[i][0], ops[i].slice(1), this));
    }
  }
  async add_rules(settings) {
    let model = settings['model']['sbml']['model'];
    let rules = model['ListOfReactionRules']['ReactionRule'];
    for (let i = 0; i < rules.length; i++) {
      await this.add_rule(rules[i]);
    }
  }
  async add_rule(rule_dict) {
    let name         = rule_dict["@name"];
    let reactants    = await this.parse_reactants(rule_dict["ListOfReactantPatterns"]["ReactantPattern"]);
    let products     = await this.parse_products(rule_dict["ListOfProductPatterns"]["ProductPattern"]);
    let ratelaw      = await this.parse_ratelaw(rule_dict["RateLaw"]);
    let ops          = await this.parse_ops(rule_dict['ListOfOperations']);
    let rule         = new Rule(name, reactants, products, ratelaw, ops);
    this.rules[name] = rule;
  }
  async add_actor_definitions(settings) {
    if (typeof this.events !== 'undefined') {
      this._add_actor_defs_event(settings);
    } else {
      this._add_actor_defs_non_event(settings);
    }
  }
  async _add_actor_defs_event(settings) {
    let model = settings['model']['sbml']['model'];
    let mol_types = model['ListOfMoleculeTypes']['MoleculeType'];
    for (let i = 0; i < mol_types.length; i++) {
      // we need to find the same molecule in NFsim definitions
      // Object.keys(this.svgs)
      if (mol_types[i]['@id'] in this.nf_molecule_types) {
        // if we have it in both, we need to consolidate
        mol_types[i]['typeID'] = this.nf_molecule_types[mol_types[i]['@id']]['typeID'];
        this.typeid_to_name[mol_types[i]['typeID']] = mol_types[i]['@id'];
        // we need to ensure component ordering is correct
        let reorder = false;
        let component_arr = mol_types[i]["ListOfComponentTypes"]["ComponentType"];
        let comp_id;
        for (let k = 0; k < this.nf_molecule_types[mol_types[i]['@id']]['components'].length; k++) {
          // if length is 1, this is not an array
          if (this.nf_molecule_types[mol_types[i]['@id']]['components'].length>1) {
            comp_id = component_arr[k]['@id'];
          } else {
            comp_id = component_arr['@id'];
          }
          // compare names
          if (this.nf_molecule_types[mol_types[i]['@id']]['components'][k]!==comp_id) {
            // this means we have a mismatch and we'll have to reorder
            reorder = true;
            // TODO: This skips order checking the component states
            // for now I'm assuming that, if the ordering of the components
            // is correct, the states are likely ordered correctly too
            // this should eventually be remedied UNLESS we determine that
            // NFsim ordering is preserved, which looks likely. 
            break;
          }
        }
        // if we must, let's reorder components
        if (reorder) {
          // let's record this happening on console, I actually don't expect
          // this will be relevant since orderings seem to be preseved
          console.log("Molecule type: ", mol_types[i]['@id'], " has a mismatch with NFsim definition. ");
          console.log("We will need to reorder the components to ensure correct ordering.\n");
          let new_component_arr = [];
          for (let k = 0; k < this.nf_molecule_types[mol_types[i]['@id']]['components'].length; k++) {
            for (let l = 0; l < component_arr.length; l++) {
              if (this.nf_molecule_types[mol_types[i]['@id']]['components'][k]!==component_arr[k]['@id']) {
                // TODO: similar to above TODO, we are assuming states are 
                // ordered correctly already
                new_component_arr.push(component_arr[k])
              }
            }
          }
          // set new array
          mol_types[i]["ListOfComponentTypes"]["ComponentType"] = new_component_arr;
        }
      } else {
        // if this is not found, we can try to continue without it 
        // but we should report it at least
        console.log("can't find: ", mol_types[i]['@id'], " in event file definitions");
      }
      // add the definition 
      this.actor_definitions[mol_types[i]['@id']] = mol_types[i];
    }
  }
  async _add_actor_defs_non_event(settings) {
    let model = settings['model']['sbml']['model'];
    let mol_types = model['ListOfMoleculeTypes']['MoleculeType'];
    for (let i = 0; i < mol_types.length; i++) {
      mol_types[i]['typeID'] = i;
      this.typeid_to_name[i] = mol_types[i]['@id'];
      this.actor_definitions[mol_types[i]['@id']] = mol_types[i];
    }
  }
  add_actor_from_name(actor_name) {
    if (typeof this.events !== 'undefined') {
      return this._add_actor_from_name_event(actor_name);
    } else {
      return this._add_actor_from_name_non_event(actor_name);
    }
  }
  _add_actor_from_name_event(actor_name) {
    let actor = this._make_actor_from_def_non_event(this.actor_definitions[actor_name]);
    actor.set_system(this);
    return actor;
  }
  _add_actor_from_name_non_event(actor_name) {
    let actor = this._make_actor_from_def_non_event(this.actor_definitions[actor_name]);
    actor.set_system(this);
    return actor;
  }
  add_actor(actor) {
    actor.set_system(this);
    if (actor.id == null) {
      this.actors[actor.name] = actor;
    } else {
      this.actors[actor.id] = actor;
    }
  }
  _make_actor_from_def_non_event(def) {
    let molecule = new Molecule(
      def["@id"],
      this,
      {},
      this.symbols[def["svg_name"]]
    );
    if ("typeID" in def) {
      molecule.typeID = def['typeID'];
    }
    if ("ListOfComponentTypes" in def) {
      let comps = def["ListOfComponentTypes"]['ComponentType'];
      this.parse_comps(comps, molecule);
    }
    return molecule;
  }
  // svgs and related methods
  add_svg(name, svg) {
    this.svgs[name] = svg;
  }
  async load_svgs(svgs) {
    for (let i = 0; i < svgs.length; i++) {
      let svg = svgs[i];
      // check if it's a file
      if (svg["type"] == "file") {
        await fetch(svg["path"])
          .then((resp) => resp.text())
          .then((str) => this.add_svg(`${svg["name"]}`, str));
      } else if (svg["type"] == "string") {
        this.add_svg(`${svg["name"]}`, svg["string"]);
      } else {
        Error(`SVG type ${svg["type"]} is not implemented!`);
      }
    }
  }
  define_symbol(rep_name) {
    let s = this.canvas.symbol();
    let def = s.svg(this.svgs[rep_name]);
    this.symbols[rep_name] = def;
  }
  define_symbols() {
    return Promise.all(
      Object.keys(this.svgs).map((x) => this.define_symbol(x))
    );
  }
  // parsing stuff 
  async parse_reactants(reactants_dict){
    let reactants = new Reactants(reactants_dict);
    return reactants;
  }
  async parse_products(products_dict){
    let products = new Products(products_dict);
    return products;
  }
  async parse_ratelaw(rate_law_dict){
    let id = rate_law_dict['@id'];
    let ratelaw = new RateLaw(id, rate_law_dict);
    return ratelaw;
  }
  async parse_ops(opt_dict){
    if (typeof opt_dict !== "undefined") {
      let ops = new Operations(opt_dict, this);
      return ops.operations; 
    } else {
      setTimeout(parse_ops, 250);
    }
  }
  parse_state(state_dict, component) {
    let name = state_dict["@id"];
    let state = new ComponentState(
      name,
      component,
      this.symbols[
        `${state_dict["svg_name"]}`
      ]
    );
    state.set_id(state_dict["state_id"]);
    return state;
  }
  parse_states(states, component) {
    if (Array.isArray(states)) {
      for (
        let j = 0;
        j < states.length;
        j++
      ) {
        let state = this.parse_state(states[j],component);
        component.add_state(state);
      }
    } else {
      let state = this.parse_state(states,component);
      component.add_state(state);
    }
  }
  parse_comp(comp, molecule) {
    let component = new Component(
      comp["@id"],
      molecule,
      [],
      0,
      comp["pos"]
    );
    component.set_system(this);
    if ("ListOfAllowedStates" in comp) {
      let states = comp["ListOfAllowedStates"]["AllowedState"];
      this.parse_states(states, component);
    } else {
      // we have no states but we want a default rep
      let state_name = `${molecule.name}_${component.name}_0`;
      let state_svg = "<svg height=\"500\" width=\"500\"><circle cx=\"100\" cy=\"100\" r=\"100\" stroke=\"black\" stroke-width=\"3\" fill=\"black\" /></svg>"
      if (!(state_name in this.svgs)) {
        this.add_svg(state_name, state_svg);
        if (!(state_name in this.symbols)) {
          this.define_symbol(state_name);
        }
      }
      let state = new ComponentState(
        state_name,
        component,
        this.symbols[
          `${state_name}`
        ]
      );
      state.set_id(0);
      component.add_state(state);
    }
    component.set_state_by_id(0);
    return component;
  }
  parse_comps(comps, molecule) {
    if (Array.isArray(comps)) {
      for (let i = 0; i < comps.length; i++) {
        let component = this.parse_comp(comps[i], molecule);
        molecule.add_component(component.name, component);
      }
    } else {
      // single component
      let component = this.parse_comp(comps, molecule);
      molecule.add_component(component.name, component);
    }
  }
}

// Main settings class for parsing a setting file
export class Settings {
  constructor(setting_file, event_file) {
    this.setting_file = setting_file;
    this.event_file = event_file;
    this.system = null;
  }
  async parse_settings_file() {
    // fetch settings JSON
    let settings_json = await fetch(this.setting_file).then((setting) =>
      setting.json()
    );
    // initialize system from settings
    let vis_settings = settings_json["visualization_settings"];
    // TODO: figure out an automated way to get suitable height/width
    let w = vis_settings["general"]["width"] ? vis_settings["general"]["width"]:(window.innerWidth*10);
    let h = vis_settings["general"]["height"] ? vis_settings["general"]["height"]:(window.innerHeight*10)-1000;
    //
    let timeline = new SVG.Timeline();
    let canvas = SVG()
      .addTo("body")
      .size(window.innerWidth, window.innerHeight)
      .viewbox(0, 0, w, h);
    // instantiate system
    let sys = new System(canvas, {}, {}, timeline, this.event_file);
    // initialize
    await sys.initialize(vis_settings);
    // return initialized system
    console.log("--System intialized--");
    this.system = sys;
  }
  async initialize() {
    await this.parse_settings_file();
  }
}
